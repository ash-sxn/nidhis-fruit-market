import React, { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, ShieldCheck, Smartphone } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useNavigate } from "react-router-dom"

type Stage = "loading" | "enroll" | "verify"

type TotpEnrollment = {
  factorId: string
  qrCode: string | null
  secret: string | null
}

export default function AdminMfaPage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>("loading")
  const [totp, setTotp] = useState<TotpEnrollment | null>(null)
  const [code, setCode] = useState("")
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function bootstrap() {
      try {
        const [{ data: aal }, { data: factors }] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors()
        ])

        if (!active) return

        if (aal?.currentLevel === 'aal2') {
          navigate('/admin', { replace: true })
          return
        }

        const verifiedTotp = factors?.totp ?? []
        if (verifiedTotp.length > 0) {
          const existingFactor = verifiedTotp[0]
          const ready = await prepareChallenge(existingFactor.id)
          if (ready) {
            setStage('verify')
            setTotp({ factorId: existingFactor.id, qrCode: null, secret: null })
          }
        } else {
          setStage('enroll')
        }
      } catch (err) {
        console.error('Failed to bootstrap MFA setup', err)
        setErrorMessage('Could not determine MFA status. Please reload the page.')
      }
    }

    bootstrap()
    return () => { active = false }
  }, [navigate])

  async function prepareChallenge(factorId: string) {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId })
    if (error || !data) {
      console.error('Failed to create MFA challenge', error)
      setErrorMessage('Could not start verification. Please try again.')
      return false
    }
    setChallengeId(data.id)
    setErrorMessage(null)
    return true
  }

  const handleEnroll = async () => {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error || !data || data.totp == null) {
        console.error('Failed to enroll MFA factor', error)
        setErrorMessage(error?.message ?? 'Could not start enrollment. Please try again.')
        return
      }
      const enrollment: TotpEnrollment = {
        factorId: data.id,
        qrCode: data.totp.qr_code ?? null,
        secret: data.totp.secret ?? null
      }
      setTotp(enrollment)
      const challengeReady = await prepareChallenge(data.id)
      if (challengeReady) {
        setStage('verify')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!totp?.factorId || !challengeId) {
      setErrorMessage('Missing challenge information. Please try again.')
      return
    }
    if (!code || code.length < 6) {
      setErrorMessage('Enter the 6-digit code from your authenticator app.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: totp.factorId,
        challengeId,
        code
      })
      if (error || !data) {
        console.error('MFA verification failed', error)
        setErrorMessage(error?.message ?? 'Invalid code, please try again.')
        await prepareChallenge(totp.factorId)
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      })
      if (sessionError) {
        console.error('Failed to refresh session after MFA', sessionError)
      }
      setCode('')
      toast({ title: 'Two-factor authentication enabled.' })
      navigate('/admin', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendChallenge = async () => {
    if (!totp?.factorId) return
    setErrorMessage(null)
    const ok = await prepareChallenge(totp.factorId)
    if (ok) setCode('')
  }

  const renderContent = () => {
    if (stage === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-green/40 border-t-green rounded-full animate-spin" />
          <p className="text-sm text-neutral-400">Checking your security setup…</p>
        </div>
      )
    }

    if (stage === 'enroll') {
      return (
        <div className="space-y-6 text-slate-100">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold">Secure your admin account</h2>
              <p className="text-sm text-slate-400">Add an authenticator app (Google Authenticator, 1Password, Authy) to protect sensitive dashboard access.</p>
            </div>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950" onClick={handleEnroll} disabled={submitting}>
            {submitting ? 'Preparing…' : 'Generate QR code'}
          </Button>
        </div>
      )
    }

    return (
      <form onSubmit={handleVerify} className="space-y-5 text-slate-100">
        {totp?.qrCode && (
          <div className="flex flex-col items-center gap-3 text-center">
            <img src={totp.qrCode} alt="Scan this QR with your authenticator app" className="w-44 h-44" />
            <p className="text-xs text-slate-400">Scan to add the token, then enter the 6-digit code below.</p>
            {totp.secret && (
              <p className="text-xs text-slate-500 select-all">Secret: {totp.secret}</p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="totp-code" className="text-sm font-medium text-slate-200">Authentication code</label>
          <Input
            id="totp-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            className="bg-slate-800 border-slate-700 text-slate-100"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <button type="button" onClick={handleResendChallenge} className="underline hover:text-slate-300">
            Restart verification
          </button>
          <span>Codes refresh every 30 seconds</span>
        </div>
        <Button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 w-full" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify and continue'}
        </Button>
      </form>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-emerald-400" />
          <div>
            <h1 className="text-xl font-semibold">Two-factor authentication required</h1>
            <p className="text-sm text-slate-400">Because you have admin permissions, we require 2FA to safeguard store operations.</p>
          </div>
        </div>
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        {renderContent()}
      </div>
      <p className="mt-6 text-xs text-slate-500">Need help? Contact the developer or store owner to reset your access.</p>
    </div>
  )
}
