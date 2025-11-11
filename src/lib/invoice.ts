import { formatInrFromCents } from "@/lib/utils"

type AddressSnapshot = Record<string, unknown> | null | undefined

export type InvoiceOrder = {
  id: string
  order_number?: string | null
  created_at: string
  currency?: string | null
  subtotal_cents?: number | null
  total_cents: number
  discount_cents?: number | null
  shipping_cents?: number | null
  payment_method?: string | null
  address_snapshot?: AddressSnapshot
  order_items?: {
    id?: string
    name_snapshot: string
    variant_label?: string | null
    quantity?: number | null
    price_cents_snapshot: number
  }[]
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadInvoiceHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  downloadBlob(blob, filename)
}

export async function tryDownloadInvoiceFromApi(orderId: string, token: string, filename: string) {
  try {
    const resp = await fetch(`/api/orders/invoice?orderId=${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const contentType = resp.headers.get("content-type") ?? ""
    if (!resp.ok || !contentType.includes("text/html")) {
      return false
    }
    const blob = await resp.blob()
    downloadBlob(blob, filename)
    return true
  } catch (err) {
    console.warn("Falling back to client-side invoice generation", err)
    return false
  }
}

export function buildInvoiceHtml(order: InvoiceOrder) {
  const currency = order.currency ?? "INR"
  const address = (order.address_snapshot ?? {}) as Record<string, string | undefined>
  const formatMoney = (value: number | null | undefined) => formatInrFromCents(value ?? 0)
  const itemsRows = (order.order_items ?? [])
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${item.name_snapshot}</strong>
            ${item.variant_label ? `<div style="color:#6b7280;font-size:12px;">${item.variant_label}</div>` : ""}
          </td>
          <td style="text-align:center;">${item.quantity ?? 0}</td>
          <td style="text-align:right;">${formatMoney(item.price_cents_snapshot)}</td>
          <td style="text-align:right;">${formatMoney((item.price_cents_snapshot ?? 0) * (item.quantity ?? 0))}</td>
        </tr>
      `
    )
    .join("")

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Invoice ${order.order_number ?? order.id}</title>
      <style>
        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color:#111827; margin:0; padding:32px; background:#f9fafb; }
        .card { background:#fff; border-radius:24px; padding:32px; box-shadow:0 20px 45px rgba(15,23,42,0.08); }
        .header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; }
        .logo { font-size:24px; font-weight:700; color:#15803d; }
        table { width:100%; border-collapse:collapse; margin-top:24px; border:1px solid #e5e7eb; }
        th, td { padding:12px; border-bottom:1px solid #e5e7eb; font-size:14px; }
        th { text-align:left; text-transform:uppercase; font-size:12px; letter-spacing:0.08em; color:#6b7280; background:#f9fafb; }
        .totals { margin-top:24px; border-radius:16px; background:#f9fafb; padding:16px; }
        .totals-row { display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:#374151; }
        .totals-row strong { font-size:16px; color:#111827; }
        .badge { display:inline-block; padding:6px 12px; border-radius:999px; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; background:#ecfccb; color:#4d7c0f; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div>
            <div class="logo">NidhiS Dry Fruits</div>
            <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Panchsheel Villa, Panchsheel Greens 2, Noida Extension · +91 9958075202</p>
          </div>
          <div style="text-align:right;">
            <div class="badge">${order.payment_method === "cod" ? "Cash on Delivery" : "Paid Online"}</div>
            <p style="margin:12px 0 0;font-size:14px;color:#6b7280;">Invoice Date</p>
            <p style="margin:4px 0 0;font-weight:600;">
              ${new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>

        <div style="display:flex; gap:32px; margin-top:32px; flex-wrap:wrap;">
          <div style="flex:1; min-width:220px;">
            <p style="color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Bill To</p>
            <p style="margin:6px 0 0;font-weight:600;">${address.name ?? ""}</p>
            <p style="margin:4px 0 0;">${address.line1 ?? ""}</p>
            ${address.line2 ? `<p style="margin:4px 0 0;">${address.line2}</p>` : ""}
            <p style="margin:4px 0 0;">${[address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p>
            ${address.phone ? `<p style="margin:6px 0 0;color:#6b7280;">📞 ${address.phone}</p>` : ""}
          </div>
          <div style="flex:1; min-width:220px;">
            <p style="color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Order</p>
            <p style="margin:6px 0 0;font-weight:600;">${order.order_number ?? order.id}</p>
            <p style="margin:4px 0 0;">${order.order_items?.length ?? 0} items • ${currency}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Price</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || `<tr><td colspan="4" style="text-align:center;color:#9ca3af;">No items recorded</td></tr>`}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${formatMoney(order.subtotal_cents ?? order.total_cents)}</span>
          </div>
          ${
            order.discount_cents
              ? `<div class="totals-row" style="color:#047857;">
                  <span>Discounts</span>
                  <span>- ${formatMoney(order.discount_cents)}</span>
                </div>`
              : ""
          }
          <div class="totals-row">
            <span>Shipping</span>
            <span>${formatMoney(order.shipping_cents ?? 0)}</span>
          </div>
          <div class="totals-row" style="margin-top:16px;">
            <strong>Total</strong>
            <strong>${formatMoney(order.total_cents)}</strong>
          </div>
        </div>

        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
          This invoice is generated automatically for your records. For any billing questions, write to hello@nidhis.in or WhatsApp +91 9958075202.
        </p>
      </div>
    </body>
  </html>`
}
