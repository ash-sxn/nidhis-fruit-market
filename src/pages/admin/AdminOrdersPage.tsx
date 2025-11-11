import React, { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { formatInrFromCents } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { Loader2, PackageCheck, RefreshCcw } from "lucide-react"

type AddressSnapshot = {
  name?: string
  phone?: string
  line1?: string
  line2?: string
  city?: string
  state?: string
  pincode?: string
}

type OrderRow = {
  id: string
  status: string
  total_cents: number
  created_at: string
  address_snapshot: AddressSnapshot
  shipping_provider: string | null
  shipping_awb: string | null
  shipping_status: string | null
  shipping_tracking_url: string | null
  shipping_label_url: string | null
  shipping_synced_at: string | null
  shipping_option: string | null
  shipping_cents: number | null
  subtotal_cents: number | null
  discount_cents: number | null
  coupon_snapshot: { code?: string } | null
  payment_method: string | null
}

async function fetchOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id,status,total_cents,subtotal_cents,discount_cents,shipping_cents,shipping_option,coupon_snapshot,created_at,address_snapshot,shipping_provider,shipping_awb,shipping_status,shipping_tracking_url,shipping_label_url,shipping_synced_at,payment_method')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as OrderRow[]
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient()
  const [manifestingId, setManifestingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const { data: orders = [], isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: fetchOrders
  })

  const createShipment = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Missing auth session')
      const resp = await fetch('/api/shiprocket/create-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      })
      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(payload.error ?? 'Failed to create shipment')
      return payload
    },
    onMutate: (orderId) => {
      setManifestingId(orderId)
    },
    onSuccess: () => {
      toast({ title: 'Shipment created' })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (err: any) => {
      toast({ title: 'Shiprocket error', description: err.message ?? 'Try again later', variant: 'destructive' })
    },
    onSettled: () => {
      setManifestingId(null)
    }
  })

  const syncShipment = useMutation({
    mutationFn: async (orderId: string) => {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Missing auth session')
      const resp = await fetch('/api/shiprocket/sync-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      })
      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(payload.error ?? 'Failed to sync tracking')
      return payload
    },
    onMutate: (orderId) => {
      setSyncingId(orderId)
    },
    onSuccess: () => {
      toast({ title: 'Tracking refreshed' })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (err: any) => {
      toast({ title: 'Sync failed', description: err.message ?? 'Try again later', variant: 'destructive' })
    },
    onSettled: () => {
      setSyncingId(null)
    }
  })

  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) throw new Error('Missing auth session')
      const resp = await fetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, status })
      })
      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(payload.error ?? 'Failed to update order')
      return payload
    },
    onMutate: ({ orderId }) => {
      setStatusUpdatingId(orderId)
    },
    onSuccess: () => {
      toast({ title: 'Order updated' })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (err: any) => {
      toast({ title: 'Update failed', description: err.message ?? 'Try again later', variant: 'destructive' })
    },
    onSettled: () => {
      setStatusUpdatingId(null)
    }
  })

  const renderStatus = (order: OrderRow) => {
    if (order.shipping_awb) {
      return (
        <span className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-xs">
            {order.shipping_status ?? 'manifested'}
          </Badge>
          {order.shipping_tracking_url && (
            <a href={order.shipping_tracking_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-300 underline">
              Track
            </a>
          )}
        </span>
      )
    }
    if (order.status === 'paid') {
      return <Badge className="bg-saffron/10 text-saffron border-saffron/30 text-xs">Awaiting shipment</Badge>
    }
    if (order.status === 'fulfilled') {
      return <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/40 text-xs">Fulfilled</Badge>
    }
    return <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 text-xs">{order.status}</Badge>
  }

  const rows = useMemo(() => orders, [orders])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Orders</h2>
          <p className="text-sm text-slate-400">Generate shipments and monitor delivery progress.</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}Refresh
        </Button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Shipping</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Loading orders…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-rose-300">{(error as Error).message}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No orders yet.</td>
              </tr>
            ) : (
              rows.map((order) => {
                const customerName = order.address_snapshot?.name ?? 'Customer'
                const customerAddress = [order.address_snapshot?.city, order.address_snapshot?.state].filter(Boolean).join(', ')
                const timestamp = formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
                return (
                  <tr key={order.id} className="border-t border-slate-800/80 align-top">
                    <td className="px-4 py-4 space-y-1 text-slate-300">
                      <div className="font-medium text-slate-100">{order.id}</div>
                      <div className="text-xs text-slate-500">Placed {timestamp}</div>
                      {order.shipping_provider && (
                        <div className="text-xs text-slate-500">{order.shipping_provider}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      <div className="font-medium text-slate-100">{customerName}</div>
                      <div className="text-xs text-slate-500">{order.address_snapshot?.phone}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{customerAddress}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-200">
                      <div className="font-medium text-slate-100">{formatInrFromCents(order.total_cents)}</div>
                      <div className="text-xs text-slate-500">Subtotal: {formatInrFromCents((order.subtotal_cents ?? order.total_cents))}</div>
                      <div className="text-xs text-slate-500">Shipping: {formatInrFromCents(order.shipping_cents ?? 0)} {order.shipping_option ? `(${order.shipping_option})` : ''}</div>
                      {order.discount_cents ? (
                        <div className="text-xs text-green-400">Discount: -{formatInrFromCents(order.discount_cents)}</div>
                      ) : null}
                      {order.coupon_snapshot?.code && (
                        <div className="text-xs text-green-500">Coupon {order.coupon_snapshot.code}</div>
                      )}
                      <div className="text-xs text-slate-500">Payment: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-200">
                      {renderStatus(order)}
                      {order.shipping_awb && (
                        <div className="mt-2 text-xs text-slate-500">AWB: {order.shipping_awb}</div>
                      )}
                      {order.shipping_synced_at && (
                        <div className="mt-1 text-2xs text-slate-600">Updated {formatDistanceToNow(new Date(order.shipping_synced_at), { addSuffix: true })}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-y-2">
                      {((order.status === 'paid') || (order.payment_method === 'cod' && order.status === 'pending')) && !order.shipping_awb ? (
                        <Button
                          size="sm"
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                          onClick={() => createShipment.mutate(order.id)}
                          disabled={manifestingId === order.id}
                        >
                          {manifestingId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}Manifest
                        </Button>
                      ) : order.shipping_awb ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-700 text-slate-200"
                          onClick={() => syncShipment.mutate(order.id)}
                          disabled={syncingId === order.id}
                        >
                          {syncingId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}Sync status
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500">Payment pending</span>
                      )}
                      <div className="flex flex-col gap-2 mt-2">
                        {order.payment_method === 'cod' && order.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-300"
                            onClick={() => statusMutation.mutate({ orderId: order.id, status: 'paid' })}
                            disabled={statusUpdatingId === order.id}
                          >
                            {statusUpdatingId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
                            Mark paid (COD)
                          </Button>
                        )}
                        {order.status !== 'fulfilled' && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-300"
                            onClick={() => statusMutation.mutate({ orderId: order.id, status: 'fulfilled' })}
                            disabled={statusUpdatingId === order.id}
                          >
                            {statusUpdatingId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
                            Mark fulfilled
                          </Button>
                        )}
                        {order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-500/40 text-rose-300"
                            onClick={() => statusMutation.mutate({ orderId: order.id, status: 'cancelled' })}
                            disabled={statusUpdatingId === order.id}
                          >
                            {statusUpdatingId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
                            Cancel order
                          </Button>
                        )}
                      </div>
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
