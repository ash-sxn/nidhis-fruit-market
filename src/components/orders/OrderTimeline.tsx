import React from "react"
import { CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimelineStep } from "@/lib/order-tracking"

const ICONS: Record<TimelineStep["key"], React.ReactNode> = {
  placed: <PackageCheck className="w-5 h-5" />,
  packed: <Clock3 className="w-5 h-5" />,
  shipped: <Truck className="w-5 h-5" />,
  delivered: <CheckCircle2 className="w-5 h-5" />,
  cancelled: <Clock3 className="w-5 h-5" />,
}

type OrderTimelineProps = {
  steps: TimelineStep[]
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ steps }) => (
  <ol className="relative border-l ml-4 pl-6 space-y-6">
    {steps.map((step, idx) => {
      const Icon = ICONS[step.key] ?? ICONS.placed
      return (
        <li key={step.key + idx} className="relative">
          <span
            className={cn(
              "absolute -left-[41px] inline-flex items-center justify-center rounded-full border-2 bg-white w-10 h-10",
              step.complete ? "border-emerald-500 text-emerald-600" : step.current ? "border-saffron text-saffron" : "border-neutral-300 text-neutral-400"
            )}
          >
            {Icon}
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-neutral-800">{step.title}</p>
              {step.current && !step.complete && (
                <span className="text-xs uppercase tracking-wide text-saffron">In progress</span>
              )}
              {step.complete && (
                <span className="text-xs uppercase tracking-wide text-emerald-600">Done</span>
              )}
            </div>
            {step.description && <p className="text-sm text-neutral-500">{step.description}</p>}
            {step.timestamp && (
              <p className="text-xs text-neutral-400">
                {new Date(step.timestamp).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}
              </p>
            )}
            {step.meta && step.key === "shipped" && (
              <a
                href={step.meta}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-emerald-600 underline"
              >
                Track shipment
              </a>
            )}
          </div>
        </li>
      )
    })}
  </ol>
)

export default OrderTimeline
