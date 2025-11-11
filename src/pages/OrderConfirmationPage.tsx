import React from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import ImageWithFallback from "@/components/ImageWithFallback"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import OrderTimeline from "@/components/orders/OrderTimeline"
import { buildOrderTimeline } from "@/lib/order-tracking"
import { ArrowRight, MapPin, Phone, Receipt, Truck } from "lucide-react"
import type { Database } from "@/integrations/supabase/types"
import { buildInvoiceHtml, downloadInvoiceHtml, tryDownloadInvoiceFromApi, type InvoiceOrder } from "@/lib/invoice"

type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"] & {
  product?: {
    image_url?: string | null
    slug?: string | null
  } | null
}

type OrderSummary = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items: OrderItemRow[]
}

const ORDER_SELECT = `id,order_number,status,payment_method,total_cents,subtotal_cents,discount_cents,shipping_cents,shipping_option,currency,address_snapshot,created_at,shipping_tracking_url,shipping_provider,shipping_awb,shipping_label_url,shipping_status,coupon_snapshot,user_id,
  order_items:order_items(id,product_id,name_snapshot,price_cents_snapshot,quantity,variant_label,variant_grams,product:products(id,image_url,slug))`

const fetchViaApi = async (orderId: string, token: string): Promise<OrderSummary | null> => {
  try {
    const resp = await fetch(`/api/orders/summary?orderId=${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const contentType = resp.headers.get("content-type") ?? ""
    if (!resp.ok || !contentType.includes("application/json")) {
      return null
    }
    const payload = await resp.json().catch(() => ({}))
    return payload?.order ?? null
  } catch (err) {
    console.warn("Order summary API fallback triggered", err)
    return null
  }
}

const fetchOrderSummary = async (orderId: string): Promise<OrderSummary> => {
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token
  if (!token) throw new Error("Login required")
  const orderFromApi = await fetchViaApi(orderId, token)
  if (orderFromApi) return orderFromApi

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle()

  if (error) throw new Error(error.message ?? "Unable to load order")
  if (!data) throw new Error("Order not found")
  return data as OrderSummary
}

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { data: order, isLoading, error } = useQuery<OrderSummary>({
    queryKey: ["order-summary", orderId],
    enabled: !!orderId,
    queryFn: () => fetchOrderSummary(orderId!),
  })

  const handleInvoice = async () => {
    if (!orderId || !order) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) {
      navigate("/auth?redirect=" + encodeURIComponent(window.location.pathname))
      return
    }
    const filename = `Invoice-${order.order_number ?? orderId}.html`
    const downloaded = await tryDownloadInvoiceFromApi(orderId, token, filename)
    if (downloaded) return
    const html = buildInvoiceHtml(order as InvoiceOrder)
    downloadInvoiceHtml(html, filename)
  }

  const handleTrack = () => {
    if (!order?.shipping_tracking_url) return
    window.open(order.shipping_tracking_url, "_blank", "noopener")
  }

  const address = order?.address_snapshot ?? {}
  const recommended = (order?.order_items ?? []).slice(0, 3)
  const deliveryEta = order?.shipping_option === "express" ? "Estimated delivery in 1-2 days" : "Estimated delivery in 3-5 days"
  const hasShipment = Boolean(order?.shipping_awb)
  const hasTrackingLink = Boolean(order?.shipping_tracking_url)

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {isLoading ? (
            <div className="text-center py-20 text-neutral-500">Loading your order...</div>
          ) : error || !order ? (
            <div className="text-center py-20 text-rose-600">{(error as Error)?.message ?? "Order not found"}</div>
          ) : (
            <>
              <section className="bg-gradient-to-r from-[#fef3c7] via-white to-white border rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-3">
                    <p className="text-sm uppercase tracking-[0.3em] text-saffron">Order confirmed</p>
                    <h1 className="text-3xl md:text-4xl font-playfair text-neutral-900">Thank you for ordering</h1>
                    <p className="text-neutral-600 max-w-2xl">
                      We’re packing your treats with care. {deliveryEta}. Updates will be shared on SMS and email as soon as the courier scans
                      your parcel.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Badge variant="secondary">#{order.order_number ?? order.id}</Badge>
                      <Badge variant="outline">
                        {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </Badge>
                      <Badge variant="outline">{order.payment_method === "cod" ? "Cash on Delivery" : "Paid online"}</Badge>
                    </div>
                  </div>
                  <div className="bg-white/80 border rounded-2xl p-4 shadow-inner w-full lg:max-w-sm">
                    <p className="text-sm font-semibold text-neutral-700">Next steps</p>
                    <ul className="mt-3 text-sm text-neutral-600 space-y-2">
                      <li>We will share tracking details once Shiprocket picks the parcel.</li>
                      <li>Download invoices or manage orders anytime from the Orders hub.</li>
                      <li>Need to change address? Reach out before the courier picks it up.</li>
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button size="sm" onClick={() => navigate("/orders")}>
                        Go to orders
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate("/products")}>
                        Continue shopping
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <div className="space-y-6">
                  <div className="bg-white border rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-neutral-600">Delivery timeline</p>
                        <p className="text-xs text-neutral-400">Track every milestone for this order</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 capitalize">{order.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <OrderTimeline steps={buildOrderTimeline(order)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-white border rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-neutral-500 font-semibold">
                        <MapPin className="w-4 h-4" />
                        Shipping address
                      </div>
                      <div className="text-sm text-neutral-700 space-y-1">
                        <p className="font-medium">{address?.name}</p>
                        <p>{address?.line1}</p>
                        {address?.line2 && <p>{address?.line2}</p>}
                        <p>{[address?.city, address?.state, address?.pincode].filter(Boolean).join(", ")}</p>
                        {address?.phone && (
                          <p className="flex items-center gap-2 text-neutral-500">
                            <Phone className="w-4 h-4" />
                            {address.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="bg-white border rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-neutral-500 font-semibold">
                        <Truck className="w-4 h-4" />
                        Shipping & payment
                      </div>
                      <div className="text-sm text-neutral-700 space-y-1">
                        <p>
                          Method: <strong>{order.payment_method === "cod" ? "Cash on Delivery" : "Online (Razorpay)"}</strong>
                        </p>
                        <p>
                          Courier: <strong>{order.shipping_provider ?? (hasShipment ? "Shiprocket" : "Assigning courier")}</strong>
                        </p>
                        <p>
                          Option: <strong>{order.shipping_option === "express" ? "Express (1-2 days)" : "Standard (3-5 days)"}</strong>
                        </p>
                        {hasShipment && (
                          <p className="text-xs text-neutral-500">
                            AWB <strong>{order.shipping_awb}</strong>
                            {order.shipping_provider ? ` • ${order.shipping_provider}` : ""}
                          </p>
                        )}
                        {order.shipping_label_url && (
                          <Button variant="link" className="p-0 h-auto text-neutral-500" asChild>
                            <a href={order.shipping_label_url} target="_blank" rel="noreferrer">
                              Download label
                            </a>
                          </Button>
                        )}
                        {hasTrackingLink ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button variant="link" className="p-0 h-auto text-saffron" onClick={handleTrack}>
                              Track shipment
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400">
                            {hasShipment
                              ? "Manifested with our courier partner. Tracking updates appear after the first scan."
                              : "We’ll share tracking details as soon as the courier picks up your parcel."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-neutral-900">Items in your order</h2>
                      <span className="text-sm text-neutral-500">{order.order_items?.length ?? 0} products</span>
                    </div>
                    <div className="space-y-3">
                      {(order.order_items ?? []).map((item) => (
                        <div key={item.id} className="flex items-center gap-4 border rounded-xl p-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100">
                            <ImageWithFallback
                              src={(item.product as any)?.image_url ?? "/placeholder.svg"}
                              alt={item.name_snapshot}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-neutral-800">{item.name_snapshot}</div>
                            <div className="text-sm text-neutral-500">{item.variant_label ?? ""}</div>
                            <div className="text-sm text-neutral-600">Qty: {item.quantity}</div>
                          </div>
                          <div className="font-semibold text-neutral-900">
                            {formatCurrency(item.price_cents_snapshot * (item.quantity ?? 0), order.currency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="font-semibold text-neutral-900">Order summary</h3>
                    <div className="flex items-center justify-between text-sm text-neutral-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.subtotal_cents ?? order.total_cents, order.currency)}</span>
                    </div>
                    {order.discount_cents ? (
                      <div className="flex items-center justify-between text-sm text-emerald-600">
                        <span>Discounts</span>
                        <span>- {formatCurrency(order.discount_cents, order.currency)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-sm text-neutral-600">
                      <span>Shipping</span>
                      <span>{formatCurrency(order.shipping_cents ?? 0, order.currency)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-lg font-semibold text-neutral-900">
                      <span>Total paid</span>
                      <span>{formatCurrency(order.total_cents, order.currency)}</span>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button onClick={handleInvoice}>
                        <Receipt className="w-4 h-4 mr-2" />
                        Download invoice
                      </Button>
                      {order.shipping_tracking_url && (
                        <Button variant="outline" onClick={handleTrack}>
                          <Truck className="w-4 h-4 mr-2" />
                          Track shipment
                        </Button>
                      )}
                      <Button variant="ghost" asChild>
                        <Link to="/orders">View all orders</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="bg-white border rounded-2xl p-5 space-y-3">
                    <h3 className="font-semibold text-neutral-900">Need help?</h3>
                    <p className="text-sm text-neutral-600">
                      WhatsApp us at <strong>+91 9958075202</strong> or email{" "}
                      <a href="mailto:hello@nidhis.in" className="text-saffron underline">
                        hello@nidhis.in
                      </a>{" "}
                      for last-minute changes or delivery instructions.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open("https://wa.me/919958075202", "_blank", "noopener")}
                    >
                      Contact support
                    </Button>
                  </div>
                </aside>
              </div>

              {recommended.length > 0 && (
                <section className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-500 uppercase tracking-wide">You might also like</p>
                      <h3 className="text-xl font-semibold text-neutral-900">Friends of your cart</h3>
                    </div>
                    <Button variant="ghost" asChild>
                      <Link to="/products" className="text-saffron flex items-center gap-1">
                        Browse more <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {recommended.map((item) => (
                      <div key={item.id} className="border rounded-2xl p-4 space-y-3">
                        <div className="h-32 rounded-xl overflow-hidden bg-neutral-100">
                          <ImageWithFallback
                            src={(item.product as any)?.image_url ?? "/placeholder.svg"}
                            alt={item.name_snapshot}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">{item.name_snapshot}</p>
                          <p className="text-sm text-neutral-500">{item.variant_label ?? ""}</p>
                        </div>
                        <Button variant="outline" asChild>
                          <Link to={((item.product as any)?.slug && `/product/${(item.product as any)?.slug}`) || "/products"}>
                            Reorder
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function formatCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format((value ?? 0) / 100)
}

export default OrderConfirmationPage
