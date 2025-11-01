import '../_lib/env.ts'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

type OrderRow = {
  id: string
  user_id: string
  status: string
  total_cents: number
  currency: string | null
  order_items: ({ price_cents_snapshot: number; quantity: number } | null)[] | null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { receipt } = (req.body || {}) as { receipt?: string }
  if (!receipt) return res.status(400).json({ error: 'receipt required' })

  const keyId = process.env.RAZORPAY_KEY_ID as string | undefined
  const keySecret = process.env.RAZORPAY_KEY_SECRET as string | undefined
  const supabaseUrl = process.env.SUPABASE_URL as string | undefined
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

  if (!keyId || !keySecret) return res.status(500).json({ error: 'Razorpay env not configured' })
  if (!supabaseUrl || !supabaseServiceRoleKey) return res.status(500).json({ error: 'Supabase service env not configured' })

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const authHeader = req.headers['authorization']
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data: authUser, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser?.user) {
    console.error('[razorpay/create-order] Supabase getUser failed', authError)
    return res.status(401).json({ error: authError?.message ?? 'Invalid auth token' })
  }

  const safeKeyId = keyId.trim()
  const safeKeySecret = keySecret.trim()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id,user_id,status,total_cents,currency,order_items:order_items(price_cents_snapshot,quantity)')
    .eq('id', receipt)
    .eq('user_id', authUser.user.id)
    .maybeSingle<OrderRow>()

  if (error) {
    console.error('[razorpay/create-order] Failed to load order', error)
    return res.status(404).json({ error: 'Order not found' })
  }
  if (!order) {
    console.error('[razorpay/create-order] Order not found for user', { receipt, userId: authUser.user.id })
    return res.status(404).json({ error: 'Order not found' })
  }
  if (order.status !== 'pending') return res.status(400).json({ error: 'Order is not pending' })

  const computedAmount = (order.order_items ?? [])
    .filter((item): item is { price_cents_snapshot: number; quantity: number } => !!item)
    .reduce((sum, item) => sum + item.price_cents_snapshot * item.quantity, 0)
  const safeOrderTotal = Number.isInteger(order.total_cents) ? order.total_cents : 0
  const amount = Math.max(computedAmount, safeOrderTotal)
  if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({ error: 'Order total invalid' })

  if (amount !== safeOrderTotal) {
    const { error: totalUpdateError } = await supabase
      .from('orders')
      .update({ total_cents: amount })
      .eq('id', receipt)

    if (totalUpdateError) return res.status(500).json({ error: 'Failed to sync order total' })
  }

  const currency = order.currency || 'INR'

  const basic = Buffer.from(`${safeKeyId}:${safeKeySecret}`).toString('base64')
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes: { receipt }
    })
  })
  const data = await resp.json()
  if (!resp.ok) {
    console.error('[razorpay/create-order] Razorpay error', resp.status, data)
    return res.status(resp.status).json(data)
  }
  return res.status(200).json({ orderId: data.id, keyId: safeKeyId, amount, currency })
}
