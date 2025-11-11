import '../_lib/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '../_lib/email.js'
import { createShiprocketShipment, isShiprocketConfigured } from '../_lib/shiprocket.js'
import type { Database } from '../../src/integrations/supabase/types.ts'

type Json = Record<string, unknown>
type AuthedClient = SupabaseClient<any, 'public', any>

type DbOrder = Database['public']['Tables']['orders']['Row']
type DbOrderItem = Database['public']['Tables']['order_items']['Row'] & {
  product?: { image_url?: string | null; slug?: string | null } | null
}
type SummaryOrder = DbOrder & { order_items: DbOrderItem[] }

type InvoiceOrder = {
  id: string
  order_number?: string | null
  created_at: string
  currency?: string | null
  subtotal_cents?: number | null
  total_cents: number
  discount_cents?: number | null
  shipping_cents?: number | null
  address_snapshot?: Json
  user_id: string
  order_items?: {
    name_snapshot: string
    variant_label?: string | null
    price_cents_snapshot: number
    quantity?: number | null
  }[]
}

type ActionHandler = (ctx: {
  req: VercelRequest
  res: VercelResponse
  supabase: AuthedClient
  userId: string
}) => Promise<void | VercelResponse>

const ORDER_SELECT =
  `id,order_number,status,payment_method,total_cents,subtotal_cents,discount_cents,shipping_cents,shipping_option,currency,address_snapshot,created_at,shipping_tracking_url,shipping_provider,shipping_awb,shipping_label_url,shipping_status,coupon_snapshot,user_id,` +
  `order_items:order_items(id,product_id,name_snapshot,price_cents_snapshot,quantity,variant_label,variant_grams,product:products(id,image_url,slug))`

const ACTIONS: Record<string, ActionHandler> = {
  summary: handleSummary,
  invoice: handleInvoice,
  'confirm-cod': handleConfirmCod,
  cancel: handleCancel,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const actionParam = req.query.action
  const action = Array.isArray(actionParam) ? actionParam[0] : actionParam
  const actionHandler = action ? ACTIONS[action] : undefined
  if (!actionHandler) {
    return res.status(404).json({ error: 'Not found' })
  }

  const supabase = createServiceClient()
  if (!supabase) return res.status(500).json({ error: 'Supabase service env not configured' })

  const token = extractAuthToken(req)
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data: authUser, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser?.user) return res.status(401).json({ error: 'Invalid auth token' })

  await actionHandler({ req, res, supabase, userId: authUser.user.id })
}

function createServiceClient(): AuthedClient | null {
  const supabaseUrl = process.env.SUPABASE_URL as string | undefined
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}

function extractAuthToken(req: VercelRequest) {
  const header = req.headers['authorization']
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7)
  }
  return null
}

async function handleSummary({ req, res, supabase, userId }: { req: VercelRequest; res: VercelResponse; supabase: AuthedClient; userId: string }) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined
  if (!orderId) {
    res.status(400).json({ error: 'orderId required' })
    return
  }

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle<SummaryOrder>()

  if (error) {
    res.status(500).json({ error: 'Failed to load order' })
    return
  }
  const order = data ?? null
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  if (order.user_id !== userId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  res.status(200).json({ order })
}

async function handleInvoice({ req, res, supabase, userId }: { req: VercelRequest; res: VercelResponse; supabase: AuthedClient; userId: string }) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined
  if (!orderId) {
    res.status(400).json({ error: 'orderId required' })
    return
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id,order_number,status,currency,total_cents,subtotal_cents,discount_cents,shipping_cents,address_snapshot,created_at,user_id,order_items(name_snapshot,quantity,price_cents_snapshot,variant_label)')
    .eq('id', orderId)
    .maybeSingle<InvoiceOrder>()

  if (error) {
    res.status(500).json({ error: 'Failed to load order' })
    return
  }
  const order = data ?? null
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  if (order.user_id !== userId) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const html = renderInvoice(order)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.order_number ?? order.id}.html`)
  res.status(200).send(html)
}

async function handleConfirmCod({ req, res, supabase, userId }: { req: VercelRequest; res: VercelResponse; supabase: AuthedClient; userId: string }) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { orderId } = (req.body || {}) as { orderId?: string }
  if (!orderId) {
    res.status(400).json({ error: 'orderId required' })
    return
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'paid', payment_ref: 'cod-cash' })
    .eq('id', orderId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('payment_method', 'cod')
    .select('id,coupon_id,email_sent_at')
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: 'Failed to update order' })
    return
  }
  if (!data) {
    res.status(409).json({ error: 'Order already processed' })
    return
  }
  const order = data as { id: string; coupon_id: string | null; email_sent_at: string | null }

  if (order.coupon_id) {
    try {
      const { data: couponRow } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', order.coupon_id)
        .maybeSingle()
      if (couponRow) {
        await supabase
          .from('coupons')
          .update({ used_count: (couponRow.used_count ?? 0) + 1 })
          .eq('id', order.coupon_id)
      }
    } catch (err) {
      console.error('Failed to increment coupon usage for COD order', err)
    }
  }

  if (!order.email_sent_at) {
    try {
      await sendOrderConfirmationEmail(orderId)
      await supabase.from('orders').update({ email_sent_at: new Date().toISOString() }).eq('id', orderId)
    } catch (err) {
      console.error('Failed to send COD confirmation email', err)
    }
  }

  if (isShiprocketConfigured()) {
    try {
      await createShiprocketShipment(orderId)
    } catch (err) {
      console.error('Failed to create COD shipment automatically', err)
    }
  }

  res.status(200).json({ ok: true })
}

async function handleCancel({ req, res, supabase, userId }: { req: VercelRequest; res: VercelResponse; supabase: AuthedClient; userId: string }) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { orderId } = (req.body || {}) as { orderId?: string }
  if (!orderId) {
    res.status(400).json({ error: 'orderId required' })
    return
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: 'Failed to cancel order' })
    return
  }
  if (!data) {
    res.status(409).json({ error: 'Order not cancellable' })
    return
  }

  try {
    await supabase.rpc('restock_order_inventory', { p_order_id: orderId })
  } catch (err) {
    console.error('Failed to restock inventory', err)
  }

  res.status(200).json({ ok: true })
}

function formatCurrency(value: number | null | undefined, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((value ?? 0) / 100)
}

function renderInvoice(order: InvoiceOrder) {
  const address = (order.address_snapshot ?? {}) as Record<string, string | undefined>
  const items = order.order_items ?? []
  const rows = items
    .map(
      (item) => `
      <tr>
        <td>${item.name_snapshot}${item.variant_label ? ` (${item.variant_label})` : ''}</td>
        <td style="text-align:center;">${item.quantity ?? 0}</td>
        <td style="text-align:right;">${formatCurrency(item.price_cents_snapshot, order.currency ?? 'INR')}</td>
        <td style="text-align:right;">${formatCurrency((item.price_cents_snapshot ?? 0) * (item.quantity ?? 0), order.currency ?? 'INR')}</td>
      </tr>
    `
    )
    .join('')

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice ${order.order_number ?? order.id}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color:#111; line-height:1.4; }
        table { width:100%; border-collapse: collapse; margin-top:16px; }
        th, td { border:1px solid #e5e7eb; padding:8px; font-size:14px; }
        th { background:#f3f4f6; text-align:left; }
      </style>
    </head>
    <body>
      <h1>Invoice</h1>
      <p><strong>Order:</strong> ${order.order_number ?? order.id}</p>
      <p><strong>Date:</strong> ${new Date(order.created_at as string).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      <h3>Bill To</h3>
      <p>
        ${address.name ?? ''}<br/>
        ${address.line1 ?? ''}<br/>
        ${address.line2 ?? ''}<br/>
        ${[address.city, address.state, address.pincode].filter(Boolean).join(', ')}<br/>
        ${address.phone ?? ''}
      </p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Price</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4" style="text-align:center;">No items</td></tr>'}</tbody>
      </table>
      <div style="margin-top:16px;font-size:14px;">
        <div>Subtotal: <strong>${formatCurrency(order.subtotal_cents ?? order.total_cents, order.currency ?? 'INR')}</strong></div>
        ${order.discount_cents ? `<div>Discount: <strong>- ${formatCurrency(order.discount_cents, order.currency ?? 'INR')}</strong></div>` : ''}
        <div>Shipping: <strong>${formatCurrency(order.shipping_cents ?? 0, order.currency ?? 'INR')}</strong></div>
        <div style="font-size:16px;margin-top:8px;">Total: <strong>${formatCurrency(order.total_cents, order.currency ?? 'INR')}</strong></div>
      </div>
    </body>
  </html>`
}
