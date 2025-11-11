import React from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import ImageWithFallback from "@/components/ImageWithFallback"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

const fetchOrderSummary = async (orderId: string) => {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) throw new Error('Login required')
  const resp = await fetch(`/api/orders/summary?orderId=${orderId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const payload = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(payload?.error ?? 'Unable to load order')
  return payload.order
}

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-summary', orderId],
    enabled: !!orderId,
    queryFn: () => fetchOrderSummary(orderId!)
  })

  const handleInvoice = async () => {
    if (!orderId) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }
    const resp = await fetch(`/api/orders/invoice?orderId=${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!resp.ok) {
      alert('Unable to download invoice right now.')
      return
    }
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Invoice-${order?.order_number ?? orderId}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-neutral-50 py-10 px-4">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          {isLoading ? (
            <div className="text-center text-neutral-500">Loading your order...</div>
          ) : error || !order ? (
            <div className="text-center text-rose-500">{(error as Error)?.message ?? 'Order not found'}</div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <p className="text-sm uppercase tracking-wide text-emerald-500">Thank you for shopping with NidhiS</p>
                <h1 className="text-3xl font-playfair font-bold">Order confirmed</h1>
                <p className="text-neutral-600">Order {order.order_number ?? order.id} • Placed {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="border rounded-xl p-4">
                  <h2 className="font-semibold text-neutral-800 mb-2">Shipping to</h2>
                  <div className="text-sm text-neutral-600 space-y-1">
                    <div>{order.address_snapshot?.name}</div>
                    <div>{order.address_snapshot?.line1}</div>
                    {order.address_snapshot?.line2 && <div>{order.address_snapshot.line2}</div>}
                    <div>{[order.address_snapshot?.city, order.address_snapshot?.state, order.address_snapshot?.pincode].filter(Boolean).join(', ')}</div>
                    <div>📞 {order.address_snapshot?.phone}</div>
                  </div>
                </div>
                <div className="border rounded-xl p-4">
                  <h2 className="font-semibold text-neutral-800 mb-2">Payment & Shipping</h2>
                  <div className="text-sm text-neutral-600 space-y-1">
                    <div>Payment method: <strong>{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'}</strong></div>
                    <div>Shipping: <strong>{order.shipping_option === 'express' ? 'Express Delivery (1-2 days)' : 'Standard Delivery (3-5 days)'}</strong></div>
                    <div>Status: <strong className="capitalize">{order.status}</strong></div>
                    <div>Total: <strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: order.currency ?? 'INR' }).format(order.total_cents / 100)}</strong></div>
                    {order.shipping_tracking_url && (
                      <div>Tracking: <a href={order.shipping_tracking_url} className="text-saffron underline" target="_blank" rel="noreferrer">View live status</a></div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-neutral-800 mb-3">Items</h2>
                <div className="space-y-3">
                  {(order.order_items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center gap-4 border rounded-lg p-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100">
                        <ImageWithFallback src={(item.product as any)?.image_url ?? '/placeholder.svg'} alt={item.name_snapshot} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-neutral-800">{item.name_snapshot}</div>
                        <div className="text-sm text-neutral-500">{item.variant_label ?? ''}</div>
                        <div className="text-sm text-neutral-600">Qty: {item.quantity}</div>
                      </div>
                      <div className="font-semibold text-neutral-800">{formatCurrency(item.price_cents_snapshot * (item.quantity ?? 0), order.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleInvoice}>Download invoice</Button>
                {order.shipping_tracking_url && (
                  <Button variant="outline" asChild>
                    <a href={order.shipping_tracking_url} target="_blank" rel="noreferrer">Track shipment</a>
                  </Button>
                )}
                <Button variant="ghost" asChild>
                  <Link to="/account">Go to my orders</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function formatCurrency(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((value ?? 0) / 100)
}

export default OrderConfirmationPage
