import React from "react"
import { Sparkles } from "lucide-react"

export default function AdminDashboard() {
  return (
    <section className="space-y-6 text-slate-100">
      <header className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/60">
          <Sparkles className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Welcome to the control room</h2>
          <p className="text-sm text-slate-400">
            Product analytics and order insights will live here. For now jump into the Products tab to manage the catalogue.
          </p>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {["Revenue", "Orders", "Conversion"].map((metric) => (
          <div key={metric} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">{metric}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-100">Coming soon</p>
            <p className="mt-1 text-xs text-slate-500">We’ll pull this from PostHog and Supabase once analytics are wired up.</p>
          </div>
        ))}
      </div>
    </section>
  )
}
