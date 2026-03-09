import React from "react"
import { NavLink, Outlet } from "react-router-dom"
import { ClipboardList, LogOut, Package, PieChart, Users, Newspaper } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

const navItems = [
  { to: "/admin", label: "Dashboard", icon: PieChart, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/blog", label: "Blog", icon: Newspaper },
  { to: "/admin/team", label: "Team", icon: Users }
]

function SidebarLink({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"}`
      }
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  )
}

export default function AdminLayout() {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth"
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-slate-800 bg-slate-900/70">
        <div className="px-6 py-6 border-b border-slate-800">
          <h1 className="text-lg font-semibold tracking-tight">Nidhis Admin</h1>
          <p className="text-xs text-slate-400 mt-1">Store operations & analytics</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 px-3 py-2 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Admin Panel</h2>
            <p className="text-xs text-slate-400">Manage catalogue, orders, and analytics</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 sm:px-6 py-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
