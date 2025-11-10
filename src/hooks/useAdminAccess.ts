import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

type AdminState = {
  loading: boolean
  isAdmin: boolean
  needsAuth: boolean
  needsMfa: boolean
}

export function useAdminAccess(): AdminState {
  const [state, setState] = useState<AdminState>({ loading: true, isAdmin: false, needsAuth: false, needsMfa: false })

  useEffect(() => {
    let cancelled = false

    async function resolveAccess(sessionInput?: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) {
      if (cancelled) return

      const session = sessionInput ?? (await supabase.auth.getSession()).data.session

      if (!session?.user) {
        if (!cancelled) setState({ loading: false, isAdmin: false, needsAuth: true, needsMfa: false })
        return
      }

      const userId = session.user.id

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      if (rolesError) {
        console.error('Failed to load roles', rolesError)
        if (!cancelled) setState({ loading: false, isAdmin: false, needsAuth: false, needsMfa: false })
        return
      }

      const isAdmin = !!roles?.some((row) => row.role === 'admin')
      if (!isAdmin) {
        if (!cancelled) setState({ loading: false, isAdmin: false, needsAuth: false, needsMfa: false })
        return
      }

      try {
        const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        const needsMfa = aalError ? false : aalData?.currentLevel !== 'aal2'
        if (!cancelled) setState({ loading: false, isAdmin: true, needsAuth: false, needsMfa })
      } catch (err) {
        console.error('Failed to resolve MFA status', err)
        if (!cancelled) setState({ loading: false, isAdmin: true, needsAuth: false, needsMfa: false })
      }
    }

    resolveAccess()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (!session?.user) {
        setState({ loading: false, isAdmin: false, needsAuth: true, needsMfa: false })
        return
      }
      resolveAccess(session)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  return state
}
