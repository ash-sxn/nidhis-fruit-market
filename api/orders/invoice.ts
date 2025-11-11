import '../_lib/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function formatCurrency(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value / 100)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined
  if (!orderId) return res.status(400).json({ error: 'orderId required' })

  const supabaseUrl = process.env.SUPABASE_URL as string | undefined
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Supabase service env not configured' })

  const authHeader = req.headers['authorization']
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: authUser, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser?.user) return res.status(401).json({ error: 'Invalid auth token' })

  const { data: order, error } = await supabase
    .from('orders')
    .select('id,order_number,status,currency,total_cents,subtotal_cents,discount_cents,shipping_cents,address_snapshot,created_at,user_id,order_items(name_snapshot,quantity,price_cents_snapshot,variant_label)')
    .eq('id', orderId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'Failed to load order' })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.user_id !== authUser.user.id) return res.status(403).json({ error: 'Forbidden' })

  const address = order.address_snapshot || {}
  const itemsRows = (order.order_items ?? []).map((item) => `
    <tr>
      <td>${item.name_snapshot}${item.variant_label ? ` (${item.variant_label})` : ''}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">${formatCurrency(item.price_cents_snapshot, order.currency)}</td>
      <td style="text-align:right;">${formatCurrency((item.price_cents_snapshot ?? 0) * (item.quantity ?? 0), order.currency)}</td>
    </tr>
  `).join('')

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice ${order.order_number}</title>
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
      <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
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
        <tbody>${itemsRows}</tbody>
      </table>
      <div style="margin-top:16px;font-size:14px;">
        <div>Subtotal: <strong>${formatCurrency(order.subtotal_cents ?? order.total_cents, order.currency)}</strong></div>
        ${order.discount_cents ? `<div>Discount: <strong>- ${formatCurrency(order.discount_cents, order.currency)}</strong></div>` : ''}
        <div>Shipping: <strong>${formatCurrency(order.shipping_cents ?? 0, order.currency)}</strong></div>
        <div style="font-size:16px;margin-top:8px;">Total: <strong>${formatCurrency(order.total_cents, order.currency)}</strong></div>
      </div>
    </body>
  </html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.order_number ?? order.id}.html`)
  return res.status(200).send(html)
}
