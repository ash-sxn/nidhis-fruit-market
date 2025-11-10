import '../../_lib/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateAdmin, supabaseAdmin } from '../../_lib/auth.js'

const ALLOWED_STATUSES = new Set(['paid', 'fulfilled', 'cancelled'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const admin = await authenticateAdmin(req, res)
  if (!admin) return

  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {}
  const orderId = typeof body.orderId === 'string' ? body.orderId : ''
  const status = typeof body.status === 'string' ? body.status : ''

  if (!orderId || !ALLOWED_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Invalid order update payload' })
  }

  const { data: current, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id,status,coupon_id')
    .eq('id', orderId)
    .maybeSingle()

  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!current) return res.status(404).json({ error: 'Order not found' })

  if (current.status === status) {
    return res.status(200).json({ order: current })
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('id,status,coupon_id,user_id')
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })

  if (status === 'cancelled') {
    try {
      await supabaseAdmin.rpc('restock_order_inventory', { p_order_id: orderId })
      if (['paid', 'fulfilled'].includes(current.status) && current.coupon_id) {
        const { data: coupon } = await supabaseAdmin
          .from('coupons')
          .select('used_count')
          .eq('id', current.coupon_id)
          .maybeSingle()
        if (coupon && (coupon.used_count ?? 0) > 0) {
          await supabaseAdmin
            .from('coupons')
            .update({ used_count: (coupon.used_count ?? 0) - 1 })
            .eq('id', current.coupon_id)
        }
      }
    } catch (err) {
      console.error('Failed to restock inventory after cancellation', err)
    }
  }

  return res.status(200).json({ order: data })
}
