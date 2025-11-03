import './env.ts'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type User } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase configuration missing')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function authenticateAdmin(req: VercelRequest, res?: VercelResponse): Promise<User | null> {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (res) res.status(401).json({ error: 'Missing auth token' })
    return null
  }
  const token = authHeader.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    if (res) res.status(401).json({ error: 'Invalid auth token' })
    return null
  }

  const { data: roles, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)

  if (rolesError || !roles?.some((row) => row.role === 'admin')) {
    if (res) res.status(403).json({ error: 'Forbidden' })
    return null
  }

  return data.user
}

export async function authenticateUser(req: VercelRequest, res?: VercelResponse): Promise<User | null> {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (res) res.status(401).json({ error: 'Missing auth token' })
    return null
  }
  const token = authHeader.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    if (res) res.status(401).json({ error: 'Invalid auth token' })
    return null
  }
  return data.user
}

export { supabaseAdmin }
