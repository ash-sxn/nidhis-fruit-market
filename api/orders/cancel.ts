import '../_lib/env.ts'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

type CancelPayload = {
  orderId?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.SUPABASE_URL as string | undefined
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
  if (!supabaseUrl || !supabaseServiceRoleKey) return res.status(500).json({ error: 'Supabase service env not configured' })

  const { orderId } = (req.body || {}) as CancelPayload
  if (!orderId) return res.status(400).json({ error: 'orderId required' })

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const authHeader = req.headers['authorization']
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data: authUser, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser?.user) return res.status(401).json({ error: 'Invalid auth token' })

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .eq('user_id', authUser.user.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'Failed to cancel order' })
  if (!data) return res.status(409).json({ error: 'Order not cancellable' })

  try {
    await supabase.rpc('restock_order_inventory', { p_order_id: orderId })
  } catch (err) {
    console.error('Failed to restock inventory', err)
  }

  return res.status(200).json({ ok: true })
}
