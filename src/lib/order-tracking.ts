import type { Database } from "@/integrations/supabase/types"

export type TimelineStep = {
  key: "placed" | "packed" | "shipped" | "delivered" | "cancelled"
  title: string
  description?: string
  timestamp?: string
  complete: boolean
  current: boolean
  meta?: string
}

type OrderRow = Database["public"]["Tables"]["orders"]["Row"]

export type OrderTimelineInput = Pick<
  OrderRow,
  "status" | "shipping_status" | "shipping_option" | "created_at" | "shipping_tracking_url" | "shipping_provider"
> & {
  payment_method?: string | null
}

const ORDER_STATUS_TO_STEP: Record<string, number> = {
  pending: 0,
  awaiting_payment: 0,
  cod_pending: 0,
  processing: 1,
  paid: 1,
  confirmed: 1,
  packed: 1,
  shipped: 2,
  in_transit: 2,
  fulfilled: 3,
  delivered: 3,
  completed: 3,
}

const SHIPPING_STATUS_TO_STEP: Record<string, number> = {
  label_created: 1,
  pickup_scheduled: 1,
  pickup_completed: 2,
  in_transit: 2,
  out_for_delivery: 2,
  delivered: 3,
}

function stepTitle(step: TimelineStep["key"], cancelled: boolean) {
  if (cancelled && step === "delivered") return "Order cancelled"
  switch (step) {
    case "placed":
      return "Order placed"
    case "packed":
      return "Packed at warehouse"
    case "shipped":
      return "Shipped & in transit"
    case "delivered":
      return cancelled ? "Order cancelled" : "Delivered"
    case "cancelled":
      return "Order cancelled"
    default:
      return ""
  }
}

export function buildOrderTimeline(input: OrderTimelineInput): TimelineStep[] {
  const cancelled = input.status === "cancelled"
  const statusIndex = ORDER_STATUS_TO_STEP[input.status] ?? 0
  const shippingIndex = SHIPPING_STATUS_TO_STEP[input.shipping_status ?? ""] ?? (statusIndex >= 2 ? statusIndex : 0)
  const currentIndex = cancelled ? 3 : Math.max(statusIndex, shippingIndex)

  const steps: TimelineStep[] = ["placed", "packed", "shipped", "delivered"].map((key, index) => ({
    key,
    title: stepTitle(key, cancelled),
    description:
      key === "placed"
        ? "We've received your order and shared the details with our kitchen team."
        : key === "packed"
          ? "Items are undergoing quality check and packaging."
          : key === "shipped"
            ? input.shipping_provider
              ? `Handed over to ${input.shipping_provider}. Tracking will update shortly.`
              : "The courier partner is preparing your shipment."
            : cancelled
              ? "This order was cancelled. Refunds (if any) are issued to your original payment method."
              : "Delivered to your doorstep. Enjoy your treats!",
    timestamp: index === 0 ? input.created_at : undefined,
    complete: !cancelled && index < currentIndex,
    current: !cancelled && index === currentIndex,
    meta:
      key === "shipped" && input.shipping_tracking_url
        ? input.shipping_tracking_url
        : key === "delivered" && cancelled
          ? "Cancelled"
          : undefined,
  }))

  if (cancelled) {
    return steps.map((step, index) => ({
      ...step,
      complete: false,
      current: index === 0,
    }))
  }

  return steps
}
