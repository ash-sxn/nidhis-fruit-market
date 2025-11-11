import '../_lib/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '../_lib/email.js'
import { createShiprocketShipment, isShiprocketConfigured } from '../_lib/shiprocket.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.SUPABASE_URL as string | undefined
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
  if (!supabaseUrl || !supabaseServiceRoleKey) return res.status(500).json({ error: 'Supabase service env not configured' })

  const { orderId } = (req.body || {}) as { orderId?: string }
  if (!orderId) return res.status(400).json({ error: 'orderId required' })

  const authHeader = req.headers['authorization']
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const { data: authUser, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser?.user) return res.status(401).json({ error: 'Invalid auth token' })

  const { data: order, error } = await supabase
    .from('orders')
    .update({ status: 'paid', payment_ref: 'cod-cash' })
    .eq('id', orderId)
    .eq('user_id', authUser.user.id)
    .eq('status', 'pending')
    .eq('payment_method', 'cod')
    .select('id,coupon_id,email_sent_at')
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'Failed to update order' })
  if (!order) return res.status(409).json({ error: 'Order already processed' })

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

  return res.status(200).json({ ok: true })
}
