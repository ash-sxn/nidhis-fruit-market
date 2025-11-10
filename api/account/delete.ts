import '../_lib/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL as string | undefined
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase service env not configured' })
  }

  const authHeader = req.headers['authorization']
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: authUser, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser?.user) {
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  const userId = authUser.user.id

  const tables = ['addresses', 'cart_items', 'wishlists', 'profile_links']
  for (const table of tables) {
    try {
      await supabase.from(table).delete().eq('user_id', userId)
    } catch (err) {
      console.error(`Failed cleaning ${table} for user ${userId}`, err)
    }
  }

  try {
    await supabase.from('profiles').delete().eq('id', userId)
  } catch (err) {
    console.error('Failed to delete profile row', err)
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
  if (deleteError) {
    return res.status(500).json({ error: deleteError.message })
  }

  return res.status(200).json({ ok: true })
}
