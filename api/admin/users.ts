import '../_lib/env.ts'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateAdmin, supabaseAdmin } from '../_lib/auth'

type RoleRow = { user_id: string; role: string }

type AdminUser = {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  roles: string[]
  mfa_enabled: boolean
}

async function fetchUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw new Error(error.message)

  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role')
  if (roleError) throw new Error(roleError.message)

  const roleMap = new Map<string, string[]>()
  roleRows?.forEach((row: RoleRow) => {
    const roles = roleMap.get(row.user_id) ?? []
    roles.push(row.role)
    roleMap.set(row.user_id, roles)
  })

  const users: AdminUser[] = (data?.users ?? []).map((user) => ({
    id: user.id,
    email: user.email ?? user.phone ?? null,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    roles: roleMap.get(user.id) ?? [],
    mfa_enabled: false,
  }))

  const adminIds = users.filter((u) => u.roles.includes('admin')).map((u) => u.id)
  for (const adminId of adminIds) {
    try {
      const { data: factors } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: adminId })
      const hasTotp = factors?.factors?.some((factor) => factor.factor_type === 'totp' && factor.status === 'verified') ?? false
      const target = users.find((u) => u.id === adminId)
      if (target) target.mfa_enabled = hasTotp
    } catch (err) {
      console.error('Failed to fetch MFA factors for', adminId, err)
    }
  }

  return users
}

function parseBody(req: VercelRequest) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch (err) {
      return {}
    }
  }
  return req.body as Record<string, unknown>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const adminUser = await authenticateAdmin(req, res)
  if (!adminUser) return

  try {
    if (req.method === 'GET') {
      const users = await fetchUsers()
      res.status(200).json({ users })
      return
    }

    const body = parseBody(req)

    if (req.method === 'POST') {
      const email = (body?.email as string | undefined)?.trim()
      if (!email) {
        res.status(400).json({ error: 'Email required' })
        return
      }
      const origin = (req.headers['origin'] as string | undefined) ?? process.env.PUBLIC_SITE_URL ?? `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'}`
      const redirectTo = `${origin.replace(/\/$/, '')}/auth`
      const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo })
      if (invite.error) {
        res.status(400).json({ error: invite.error.message })
        return
      }
      const invitedUser = invite.data?.user
      if (invitedUser?.id) {
        await supabaseAdmin.from('user_roles').upsert({ user_id: invitedUser.id, role: 'admin' })
      }
      const users = await fetchUsers()
      res.status(200).json({ users })
      return
    }

    if (req.method === 'PATCH') {
      const userId = body?.userId as string | undefined
      const makeAdmin = body?.makeAdmin as boolean | undefined
      if (!userId || typeof makeAdmin !== 'boolean') {
        res.status(400).json({ error: 'userId and makeAdmin are required' })
        return
      }

      if (makeAdmin) {
        await supabaseAdmin.from('user_roles').upsert({ user_id: userId, role: 'admin' })
      } else {
        if (userId === adminUser.id) {
          res.status(400).json({ error: 'You cannot remove your own admin access.' })
          return
        }
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin')
      }
      const users = await fetchUsers()
      res.status(200).json({ users })
      return
    }

    res.setHeader('Allow', 'GET,POST,PATCH')
    res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Admin users API error', err)
    res.status(500).json({ error: err?.message ?? 'Unexpected error' })
  }
}
