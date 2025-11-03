import React, { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { ShieldCheck, UserPlus, Users } from "lucide-react"

type AdminUser = {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
  roles: string[]
  mfa_enabled: boolean
}

async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const response = await fetch('/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? 'Failed to load team members')
  }
  const payload = await response.json()
  return payload.users as AdminUser[]
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAdminUsers
  })

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email })
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to invite admin')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast({ title: 'Invitation sent', description: 'The user will receive an email to complete enrollment.' })
      setInviteEmail("")
    },
    onError: (err: any) => {
      toast({ title: 'Could not invite admin', description: err.message ?? 'Unknown error', variant: 'destructive' })
    }
  })

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, makeAdmin })
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to update role')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast({ title: 'Roles updated' })
    },
    onError: (err: any) => {
      toast({ title: 'Could not update role', description: err.message ?? 'Unknown error', variant: 'destructive' })
    }
  })

  const handleInvite = (event: React.FormEvent) => {
    event.preventDefault()
    if (!inviteEmail.trim()) {
      toast({ title: 'Enter an email', variant: 'destructive' })
      return
    }
    inviteMutation.mutate(inviteEmail.trim())
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/70">
            <Users className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Team access</h2>
            <p className="text-sm text-slate-400">Invite trusted teammates and review who can manage the store.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <Input
          type="email"
          placeholder="team@trusted.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="bg-slate-900 border-slate-700 text-slate-100"
          required
        />
        <Button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950" disabled={inviteMutation.isPending}>
          <UserPlus className="mr-2 h-4 w-4" />
          {inviteMutation.isPending ? 'Sending invite…' : 'Invite admin'}
        </Button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="px-4 py-3 font-medium">2FA</th>
              <th className="px-4 py-3 font-medium">Last active</th>
              <th className="px-4 py-3 font-medium text-right">Admin access</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Loading team…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rose-300">{(error as Error).message}</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No team members yet.</td>
              </tr>
            ) : (
              users.map((user) => {
                const isAdmin = user.roles.includes('admin')
                const lastSeen = user.last_sign_in_at
                  ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                  : 'Never'
                return (
                  <tr key={user.id} className="border-t border-slate-800/80">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">{user.email ?? 'Unknown'}</span>
                        <span className="text-xs text-slate-500">User ID: {user.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.roles.length === 0 ? (
                        <span className="text-slate-500 text-xs">Customer</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="bg-slate-800 text-slate-200 border-slate-700 text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.mfa_enabled ? (
                        <div className="inline-flex items-center gap-2 text-emerald-300 text-xs">
                          <ShieldCheck className="h-4 w-4" /> Enabled
                        </div>
                      ) : (
                        <span className="text-xs text-rose-300">Not enrolled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{lastSeen}</td>
                    <td className="px-4 py-3 text-right">
                      <Switch
                        checked={isAdmin}
                        disabled={user.id === currentUserId || toggleRoleMutation.isPending}
                        onCheckedChange={(checked) => toggleRoleMutation.mutate({ userId: user.id, makeAdmin: checked })}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
