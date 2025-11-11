import '../_lib/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

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
    .select(`id,order_number,status,payment_method,total_cents,subtotal_cents,discount_cents,shipping_cents,shipping_option,currency,address_snapshot,created_at,shipping_tracking_url,shipping_provider,shipping_awb,shipping_label_url,shipping_status,coupon_snapshot,user_id,
      order_items:order_items(id,product_id,name_snapshot,price_cents_snapshot,quantity,variant_label,variant_grams,product:products(id,image_url,slug))`)
    .eq('id', orderId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'Failed to load order' })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.user_id !== authUser.user.id) return res.status(403).json({ error: 'Forbidden' })

  return res.status(200).json({ order })
}
