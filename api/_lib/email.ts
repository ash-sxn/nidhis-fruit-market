import './env.js'
import { Resend } from 'resend'
import { supabaseAdmin } from './auth.js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const ORDER_FROM_EMAIL = process.env.ORDER_FROM_EMAIL
const ORDER_BCC_EMAIL = process.env.ORDER_BCC_EMAIL

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export async function sendOrderConfirmationEmail(orderId: string) {
  if (!RESEND_API_KEY || !ORDER_FROM_EMAIL) {
    console.warn('Resend not configured; skipping order confirmation email')
    return
  }

  const resend = new Resend(RESEND_API_KEY)

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,total_cents,subtotal_cents,discount_cents,shipping_cents,currency,address_snapshot,created_at,coupon_snapshot,shipping_provider,shipping_tracking_url,payment_method,order_items(name_snapshot,price_cents_snapshot,quantity)')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    console.error('Unable to fetch order for email', orderId, error)
    return
  }

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(order.user_id)
  const toEmail = user?.user?.email ?? order.address_snapshot?.email
  if (!toEmail) {
    console.warn('No recipient email for order', orderId)
    return
  }

  const itemsRows = (order.order_items ?? []).map((item) => {
    const line = (item.price_cents_snapshot ?? 0) * (item.quantity ?? 0)
    return `<tr>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;">${item.name_snapshot}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${currencyFormatter.format((item.price_cents_snapshot ?? 0) / 100)}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${currencyFormatter.format(line / 100)}</td>
    </tr>`
  }).join('')

  const discount = order.discount_cents ?? 0
  const shipping = order.shipping_cents ?? 0
  const subtotal = order.subtotal_cents ?? order.total_cents
  const total = order.total_cents ?? subtotal - discount + shipping
  const paymentLabel = order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'

  const address = order.address_snapshot || {}

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#111827;">
      <p style="font-size:14px;">Hi ${address.name ?? ''},</p>
      <p style="font-size:14px;">Thank you for shopping with NidhiS. We've received your order <strong>${order.id}</strong> placed on ${new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.</p>
      <h2 style="margin-top:24px;font-size:16px;">Order summary</h2>
      <table style="border-collapse: collapse; width: 100%; margin-top: 8px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Product</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">Qty</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">Price</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      <div style="margin-top:16px;font-size:14px;">
        <div>Subtotal: <strong>${currencyFormatter.format(subtotal / 100)}</strong></div>
        ${discount > 0 ? `<div>Discount: <strong>- ${currencyFormatter.format(discount / 100)}</strong></div>` : ''}
        <div>Shipping: <strong>${currencyFormatter.format(shipping / 100)}</strong></div>
        <div>Payment method: <strong>${paymentLabel}</strong></div>
        <div style="margin-top:8px;font-size:16px;">Total paid: <strong>${currencyFormatter.format(total / 100)}</strong></div>
      </div>
      <div style="margin-top:24px;font-size:14px;">
        <h3 style="font-size:15px;margin-bottom:4px;">Shipping to</h3>
        <div>${address.name ?? ''}</div>
        <div>${address.line1 ?? ''}</div>
        ${address.line2 ? `<div>${address.line2}</div>` : ''}
        <div>${[address.city, address.state, address.pincode].filter(Boolean).join(', ')}</div>
        <div>${address.phone ?? ''}</div>
      </div>
      ${order.shipping_tracking_url ? `<p style="margin-top:16px;font-size:14px;">Track your shipment here: <a href="${order.shipping_tracking_url}">${order.shipping_tracking_url}</a></p>` : ''}
      <p style="margin-top:24px;font-size:14px;">If you have any questions, reply to this email and our team will help you out.</p>
      <p style="margin-top:16px;font-size:14px;">Warm regards,<br/>Team NidhiS</p>
    </div>
  `

  const subject = `Order ${order.id} confirmed`

  try {
    await resend.emails.send({
      from: ORDER_FROM_EMAIL,
      to: toEmail,
      bcc: ORDER_BCC_EMAIL ? [ORDER_BCC_EMAIL] : undefined,
      subject,
      html,
    })
  } catch (err) {
    console.error('Failed to send order confirmation email', err)
  }
}
