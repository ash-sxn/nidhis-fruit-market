/// <reference types="vite/client" />

/**
 * Minimal TypeScript surface area for the Razorpay Checkout SDK.
 *
 * Razorpay ships its own type definitions for their npm package, but when we
 * load the script from Razorpay's CDN we need to tell TypeScript what ends up on
 * `window`.  Declaring the interfaces here keeps the checkout page strongly
 * typed without pulling in additional dependencies.
 */

type RazorpayPrefill = {
  name?: string
  email?: string
  contact?: string
}

type RazorpayTheme = {
  color?: string
}

type RazorpayModalOptions = {
  ondismiss?: () => void
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name?: string
  description?: string
  order_id?: string
  prefill?: RazorpayPrefill
  notes?: Record<string, string>
  handler?: (response: RazorpayPaymentResponse) => void
  theme?: RazorpayTheme
  modal?: RazorpayModalOptions
}

type RazorpayPaymentResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayInstance = {
  open: () => void
  close: () => void
  on: (event: string, handler: (response: unknown) => void) => void
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

export {}
