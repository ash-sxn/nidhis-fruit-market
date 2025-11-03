/**
 * Tiny helper for lazily loading the hosted Razorpay Checkout SDK.
 *
 * The checkout page calls {@link ensureRazorpay} right before it wants to open
 * the modal.  By deferring the network request until the user actually starts
 * the payment flow, we avoid shipping Razorpay to every visitor by default and
 * keep the initial bundle smaller.  The promise cache also ensures we only add
 * the script tag once even if multiple components try to launch checkout at the
 * same time.
 */
const SCRIPT_ID = 'razorpay-sdk'
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

let loadPromise: Promise<void> | null = null

function appendScript() {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      loadPromise = null
      reject(new Error('Failed to load Razorpay SDK'))
    }
    document.body.appendChild(script)
  })
}

/**
 * Adds the Razorpay script tag to the document and resolves when it finishes
 * loading.  Throws if the function runs on the server (where `window` is
 * undefined) so that we never try to instantiate Razorpay during SSR.
 */
export function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay can only be loaded in the browser'))
  if (!loadPromise) loadPromise = appendScript()
  return loadPromise
}

/**
 * Convenience wrapper that waits for the SDK and then returns the constructor
 * exposed on `window`.  The checkout page calls `new (await ensureRazorpay())`
 * to open the modal.
 */
export async function ensureRazorpay() {
  await loadRazorpayScript()
  if (typeof window === 'undefined' || !window.Razorpay) throw new Error('Razorpay SDK unavailable')
  return window.Razorpay
}
