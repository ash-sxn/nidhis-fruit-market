import '../_lib/env.ts'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '../_lib/email'
import { createShiprocketShipment, isShiprocketConfigured } from '../_lib/shiprocket'

type VerifyPayload = {
  orderId?: string
  razorpay_payment_id?: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

type OrderRow = {
  id: string
  user_id: string
  status: string
  payment_ref: string | null
  coupon_id?: string | null
  email_sent_at?: string | null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.RAZORPAY_KEY_SECRET as string | undefined
  const supabaseUrl = process.env.SUPABASE_URL as string | undefined
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

  if (!secret) return res.status(500).json({ error: 'Razorpay secret not configured' })
  if (!supabaseUrl || !supabaseServiceRoleKey) return res.status(500).json({ error: 'Supabase service env not configured' })

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = (req.body || {}) as VerifyPayload
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment payload' })
  }

  let provided: Buffer
  try {
    provided = Buffer.from(razorpay_signature, 'hex')
  } catch {
    return res.status(400).json({ error: 'Invalid signature encoding' })
  }

  const expected = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest()
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(400).json({ error: 'Signature mismatch' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const authHeader = req.headers['authorization']
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data: authUser, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser?.user) return res.status(401).json({ error: 'Invalid auth token' })

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id,user_id,status,payment_ref,coupon_id,email_sent_at')
    .eq('id', orderId)
    .maybeSingle<OrderRow>()

  if (fetchError) return res.status(500).json({ error: 'Failed to load order' })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.user_id !== authUser.user.id) return res.status(403).json({ error: 'Forbidden' })
  if (order.status === 'paid' && order.payment_ref === razorpay_payment_id) {
    return res.status(200).json({ ok: true })
  }
  if (order.status !== 'pending') return res.status(400).json({ error: 'Order is not pending' })

  const { data, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'paid', payment_ref: razorpay_payment_id })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id,coupon_id,user_id,email_sent_at')
    .maybeSingle<OrderRow>()

  if (updateError) return res.status(500).json({ error: 'Failed to mark order paid' })
  if (!data) return res.status(409).json({ error: 'Order already processed' })

  if (data.coupon_id) {
    try {
      const { data: couponRow } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', data.coupon_id)
        .maybeSingle()
      if (couponRow) {
        await supabase
          .from('coupons')
          .update({ used_count: (couponRow.used_count ?? 0) + 1 })
          .eq('id', data.coupon_id)
      }
    } catch (err) {
      console.error('Failed to increment coupon usage', err)
    }
  }

  if (!data.email_sent_at) {
    try {
      await sendOrderConfirmationEmail(orderId)
      await supabase.from('orders').update({ email_sent_at: new Date().toISOString() }).eq('id', orderId)
    } catch (err) {
      console.error('Failed to send confirmation email', err)
    }
  }

  if (isShiprocketConfigured()) {
    try {
      await createShiprocketShipment(orderId)
    } catch (err) {
      console.error('Failed to create Shiprocket shipment', err)
    }
  }

  return res.status(200).json({ ok: true })
}
