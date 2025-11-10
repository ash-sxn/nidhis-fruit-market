import '../_lib/env.ts'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateUser, supabaseAdmin } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const user = await authenticateUser(req, res)
  if (!user) return

  const body = typeof req.body === 'object' && req.body ? (req.body as Record<string, unknown>) : {}
  const rawCode = typeof body.code === 'string' ? body.code.trim() : ''
  const code = rawCode.toUpperCase()
  const subtotal = typeof body.subtotal_cents === 'number' ? Math.max(body.subtotal_cents, 0) : 0

  if (!rawCode) return res.status(400).json({ error: 'Coupon code required' })
  if (subtotal <= 0) return res.status(400).json({ error: 'Subtotal must be greater than zero' })

  const { data: coupon, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .eq('code', code)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!coupon) return res.status(404).json({ error: 'Coupon not found or inactive' })

  const now = new Date()
  if (coupon.starts_at && now < new Date(coupon.starts_at)) {
    return res.status(400).json({ error: 'Coupon is not active yet' })
  }
  if (coupon.ends_at && now > new Date(coupon.ends_at)) {
    return res.status(400).json({ error: 'Coupon has expired' })
  }
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return res.status(400).json({ error: 'Coupon usage limit reached' })
  }
  if (coupon.min_order_cents && subtotal < coupon.min_order_cents) {
    return res.status(400).json({ error: `Requires minimum order of ₹${(coupon.min_order_cents / 100).toFixed(2)}` })
  }
  if (coupon.usage_limit_per_user) {
    const { count, error: usageError } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('coupon_id', coupon.id)
      .in('status', ['paid', 'fulfilled'])
    if (usageError) return res.status(500).json({ error: usageError.message })
    if ((count ?? 0) >= coupon.usage_limit_per_user) {
      return res.status(400).json({ error: 'You have already used this coupon the maximum times allowed' })
    }
  }

  let discount = 0
  if (coupon.type === 'percent') {
    discount = Math.round(subtotal * (coupon.value / 100))
  } else {
    discount = coupon.value
  }
  if (discount > subtotal) discount = subtotal

  return res.status(200).json({
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
    },
    discount_cents: discount,
  })
}
