import React, { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, Loader2, MapPin, PackageSearch, Receipt, Truck } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ImageWithFallback from "@/components/ImageWithFallback"
import { formatInrFromCents } from "@/lib/utils"
import { buildOrderTimeline } from "@/lib/order-tracking"
import OrderTimeline from "@/components/orders/OrderTimeline"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "@/components/ui/use-toast"
import type { Database } from "@/integrations/supabase/types"
import { buildInvoiceHtml, downloadInvoiceHtml, tryDownloadInvoiceFromApi } from "@/lib/invoice"

type OrderRow = Database["public"]["Tables"]["orders"]["Row"]
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"] & {
  product?: {
    image_url?: string | null
    slug?: string | null
  } | null
}

type OrdersPageOrder = OrderRow & {
  order_items: OrderItemRow[]
}

const FILTERS = [
  { value: "all", label: "All orders" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "On the way" },
  { value: "delivered", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const

const fetchOrders = async (): Promise<OrdersPageOrder[]> => {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) throw new Error("Please sign in to view your orders.")

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id,order_number,status,payment_method,currency,total_cents,subtotal_cents,discount_cents,shipping_cents,shipping_option,shipping_provider,shipping_awb,shipping_status,shipping_tracking_url,shipping_label_url,address_snapshot,created_at,
      order_items:order_items(id,product_id,name_snapshot,quantity,price_cents_snapshot,variant_label,variant_grams,product:products(image_url,slug))`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as OrdersPageOrder[]
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  awaiting_payment: "bg-amber-100 text-amber-800",
  processing: "bg-saffron/15 text-saffron",
  paid: "bg-emerald-100 text-emerald-700",
  packed: "bg-emerald-100 text-emerald-700",
  shipped: "bg-sky-100 text-sky-700",
  fulfilled: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
}

const filterMatches = (status: string, filter: (typeof FILTERS)[number]["value"]) => {
  if (filter === "all") return true
  if (filter === "processing") return ["pending", "awaiting_payment", "processing", "paid", "packed"].includes(status)
  if (filter === "shipped") return ["shipped"].includes(status)
  if (filter === "delivered") return ["fulfilled", "delivered", "completed"].includes(status)
  if (filter === "cancelled") return status === "cancelled"
  return true
}

const OrdersPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]["value"]>("all")
  const [selectedOrder, setSelectedOrder] = useState<OrdersPageOrder | null>(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders-list"],
    queryFn: fetchOrders,
  })

  const filteredOrders = useMemo(
    () => orders.filter((order) => filterMatches(order.status, activeFilter)),
    [orders, activeFilter]
  )

  const handleInvoiceDownload = async (order: OrdersPageOrder) => {
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) {
      navigate("/auth?redirect=/orders")
      return
    }
    const filename = `Invoice-${order.order_number ?? order.id}.html`
    const downloaded = await tryDownloadInvoiceFromApi(order.id, token, filename)
    if (downloaded) return
    downloadInvoiceHtml(buildInvoiceHtml(order), filename)
  }

  const handleTrack = (order: OrdersPageOrder) => {
    if (order.shipping_tracking_url) {
      window.open(order.shipping_tracking_url, "_blank", "noopener")
      return
    }
    toast({ title: "Tracking not ready yet", description: "We'll email you as soon as the courier scans your parcel." })
  }

  const latestOrder = orders[0]

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="bg-gradient-to-r from-[#fef3c7] via-white to-white border rounded-3xl p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-saffron mb-2">Orders & Tracking</p>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-playfair text-neutral-900">Manage your purchases</h1>
                <p className="text-neutral-600 max-w-2xl mt-2">
                  Track shipments in real time, download invoices, schedule COD deliveries, and revisit gifts you loved.
                </p>
              </div>
              {latestOrder && (
                <div className="bg-white/80 border rounded-2xl p-4 shadow-inner w-full md:w-80">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Latest order</p>
                  <p className="text-lg font-semibold text-neutral-900">{latestOrder.order_number ?? latestOrder.id}</p>
                  <p className="text-sm text-neutral-500">
                    {new Date(latestOrder.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <Badge className={statusStyles[latestOrder.status] ?? "bg-neutral-100 text-neutral-700"}>
                      {latestOrder.status.replace(/_/g, " ")}
                    </Badge>
                    <Button variant="link" className="text-saffron p-0 h-auto" onClick={() => setSelectedOrder(latestOrder)}>
                      View timeline
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={activeFilter === filter.value ? "default" : "outline"}
                onClick={() => setActiveFilter(filter.value)}
                className={activeFilter === filter.value ? "" : "bg-white"}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin mr-2 text-saffron" />
              Fetching your orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white border rounded-2xl shadow-sm">
              <PackageSearch className="w-12 h-12 mx-auto text-neutral-300" />
              <h2 className="text-xl font-semibold mt-4">No orders under this filter</h2>
              <p className="text-neutral-500 max-w-md mx-auto mt-2">
                Place your first order or adjust the filters to see previous purchases.
              </p>
              <Button className="mt-6" onClick={() => navigate("/products")}>
                Continue shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="border border-neutral-200 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-neutral-500">Order ID</p>
                        <p className="text-lg font-semibold text-neutral-900">{order.order_number ?? order.id}</p>
                        <p className="text-xs text-neutral-400">
                          Placed {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusStyles[order.status] ?? "bg-neutral-100 text-neutral-700"}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline">{order.payment_method === "cod" ? "Cash on Delivery" : "Online payment"}</Badge>
                        {order.shipping_awb && <Badge variant="outline">AWB {order.shipping_awb}</Badge>}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        {(order.order_items ?? []).map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 border">
                              <ImageWithFallback
                                src={item.product?.image_url ?? "/placeholder.svg"}
                                alt={item.name_snapshot}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">{item.name_snapshot}</p>
                              <p className="text-sm text-neutral-500">
                                Qty {item.quantity} {item.variant_label ? `· ${item.variant_label}` : ""}
                              </p>
                              <p className="text-sm font-semibold text-neutral-800">
                                {formatInrFromCents((item.price_cents_snapshot ?? 0) * (item.quantity ?? 0))}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-neutral-600">
                          <MapPin className="w-4 h-4" />
                          <p className="text-sm font-semibold">Shipping to</p>
                        </div>
                        <div className="text-sm text-neutral-600">
                          <p>{(order.address_snapshot as any)?.name}</p>
                          <p>{(order.address_snapshot as any)?.line1}</p>
                          {(order.address_snapshot as any)?.line2 && <p>{(order.address_snapshot as any)?.line2}</p>}
                          <p>
                            {[(order.address_snapshot as any)?.city, (order.address_snapshot as any)?.state, (order.address_snapshot as any)?.pincode]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">Order total</span>
                          <span className="font-semibold text-neutral-900">{formatInrFromCents(order.total_cents)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => setSelectedOrder(order)}>
                            View details
                          </Button>
                          <Button variant="outline" onClick={() => handleTrack(order)}>
                            <Truck className="w-4 h-4 mr-2" />
                            Track
                          </Button>
                          <Button variant="ghost" onClick={() => handleInvoiceDownload(order)}>
                            <Receipt className="w-4 h-4 mr-2" />
                            Invoice
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Order {selectedOrder.order_number ?? selectedOrder.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-neutral-500">Status</p>
                    <Badge className={statusStyles[selectedOrder.status] ?? "bg-neutral-100 text-neutral-700"}>
                      {selectedOrder.status.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-xs text-neutral-400">
                      Placed {new Date(selectedOrder.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-neutral-500">Payment</p>
                    <p className="font-semibold text-neutral-900">
                      {selectedOrder.payment_method === "cod" ? "Cash on Delivery" : "Online (Razorpay)"}
                    </p>
                    {selectedOrder.shipping_awb && <p className="text-sm text-neutral-500">AWB: {selectedOrder.shipping_awb}</p>}
                    {selectedOrder.shipping_tracking_url && (
                      <Button variant="link" className="p-0 h-auto text-saffron" onClick={() => handleTrack(selectedOrder)}>
                        Track shipment <ArrowUpRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-white border rounded-2xl p-4">
                  <p className="font-semibold mb-3">Delivery timeline</p>
                  <OrderTimeline steps={buildOrderTimeline(selectedOrder)} />
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-800 mb-3">Items in this order</h3>
                  <div className="space-y-3">
                    {(selectedOrder.order_items ?? []).map((item) => (
                      <div key={item.id} className="flex items-center gap-4 border rounded-xl p-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100">
                          <ImageWithFallback
                            src={item.product?.image_url ?? "/placeholder.svg"}
                            alt={item.name_snapshot}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900">{item.name_snapshot}</p>
                          <p className="text-sm text-neutral-500">
                            Qty {item.quantity} {item.variant_label ? `· ${item.variant_label}` : ""}
                          </p>
                        </div>
                        <p className="font-semibold text-neutral-900">
                          {formatInrFromCents((item.price_cents_snapshot ?? 0) * (item.quantity ?? 0))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-neutral-50 rounded-2xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-neutral-600">Shipping address</p>
                  <p className="text-sm text-neutral-600">
                    <span className="font-medium">{(selectedOrder.address_snapshot as any)?.name}</span>
                    <br />
                    {(selectedOrder.address_snapshot as any)?.line1}
                    <br />
                    {(selectedOrder.address_snapshot as any)?.line2}
                    <br />
                    {[
                      (selectedOrder.address_snapshot as any)?.city,
                      (selectedOrder.address_snapshot as any)?.state,
                      (selectedOrder.address_snapshot as any)?.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                <div className="border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Subtotal</span>
                    <span>{formatInrFromCents(selectedOrder.subtotal_cents ?? selectedOrder.total_cents)}</span>
                  </div>
                  {selectedOrder.discount_cents ? (
                    <div className="flex items-center justify-between text-sm text-emerald-600">
                      <span>Discounts</span>
                      <span>- {formatInrFromCents(selectedOrder.discount_cents)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Shipping</span>
                    <span>{formatInrFromCents(selectedOrder.shipping_cents ?? 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total paid</span>
                    <span>{formatInrFromCents(selectedOrder.total_cents)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={() => handleInvoiceDownload(selectedOrder)}>
                      <Receipt className="w-4 h-4 mr-2" />
                      Download invoice
                    </Button>
                    <Button variant="outline" onClick={() => handleTrack(selectedOrder)}>
                      <Truck className="w-4 h-4 mr-2" />
                      Track shipment
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OrdersPage
