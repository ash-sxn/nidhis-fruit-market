import React, { useMemo, useState } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import CartButtonPanel from "@/components/CartButtonPanel"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { formatInrFromCents } from "@/lib/utils"
import { ensureRazorpay } from "@/lib/razorpay"
import { toast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import type { Database } from "@/integrations/supabase/types"

const SHIPPING_OPTIONS = [
  { id: 'standard', label: 'Standard Delivery (3-5 days)', amount: 6000 },
  { id: 'express', label: 'Express Delivery (1-2 days)', amount: 12000 }
] as const

const PAYMENT_OPTIONS = [
  { id: 'online', label: 'Pay online (UPI / Cards / Netbanking)' },
  { id: 'cod', label: 'Cash on Delivery' }
] as const

const AddressSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  line1: z.string().min(5),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4),
})

type AddressInput = z.infer<typeof AddressSchema>

type CartRow = {
  id: string
  product_id: string
  variant_id: string
  quantity: number
  product?: { id: string; name: string; image_url: string | null } | null
  variant?: { id: string; label: string; price_cents: number; mrp_cents: number | null; inventory: number | null; grams: number | null } | null
}

type SavedAddress = Database['public']['Tables']['addresses']['Row']

async function fetchCartWithProducts(): Promise<CartRow[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return []
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      product_id,
      variant_id,
      quantity,
      product:products(id,name,image_url),
      variant:product_variants(id,label,price_cents,mrp_cents,inventory,grams)
    `)
    .eq('user_id', uid)
    .order('added_at', { ascending: false })
  if (error) throw error
  if (!data) return []
  return data.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    variant_id: row.variant_id,
    quantity: row.quantity,
    product: (row as any).product ?? null,
    variant: (row as any).variant ?? null
  }))
}

async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return []
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', uid)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export default function CheckoutPage() {
  const { data: cart = [], isLoading } = useQuery({ queryKey: ['cart-with-products'], queryFn: fetchCartWithProducts })
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<AddressInput>({ resolver: zodResolver(AddressSchema) })
  const [selectedShipping, setSelectedShipping] = useState<typeof SHIPPING_OPTIONS[number]>(SHIPPING_OPTIONS[0])
  const [couponCode, setCouponCode] = useState('')
  const [couponState, setCouponState] = useState<{ code: string; discount_cents: number } | null>(null)
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<typeof PAYMENT_OPTIONS[number]>(PAYMENT_OPTIONS[0])
  const { data: savedAddresses = [] } = useQuery({ queryKey: ['saved-addresses'], queryFn: fetchSavedAddresses })

  const subtotal = useMemo(() => cart.reduce((sum, r) => sum + ((r.variant?.price_cents ?? 0) * r.quantity), 0), [cart])
  const discountCents = couponState?.discount_cents ?? 0
  const shippingCents = selectedShipping.amount
  const total = useMemo(() => Math.max(subtotal - discountCents + shippingCents, 0), [subtotal, discountCents, shippingCents])
  const outOfStockItems = cart.filter((item) => (item.variant?.inventory ?? 0) < item.quantity)
  const canSubmit = !isSubmitting && !isProcessingPayment && cart.length > 0 && outOfStockItems.length === 0

  const fillSavedAddress = (address: SavedAddress) => {
    setValue('name', address.name)
    setValue('phone', address.phone)
    setValue('line1', address.line1)
    setValue('line2', address.line2 ?? '')
    setValue('city', address.city)
    setValue('state', address.state)
    setValue('pincode', address.pincode)
  }

  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim()
    if (!trimmed) {
      toast({ title: 'Enter a coupon code', variant: 'destructive' })
      return
    }
    setIsApplyingCoupon(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Login required')
      const response = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: trimmed, subtotal_cents: subtotal })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error ?? 'Unable to apply coupon')
      setCouponState({ code: payload.coupon.code, discount_cents: payload.discount_cents })
      toast({ title: `Coupon ${payload.coupon.code} applied`, description: `You saved ${formatInrFromCents(payload.discount_cents)}` })
    } catch (err: any) {
      toast({ title: 'Coupon not applied', description: err?.message ?? 'Try again later', variant: 'destructive' })
      setCouponState(null)
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const onSubmit = async (values: AddressInput) => {
    let orderId: string | undefined
    let accessToken: string | undefined
    setIsProcessingPayment(true)

    const unavailable = cart.find((item) => (item.variant?.inventory ?? 0) < item.quantity)
    if (unavailable) {
      toast({
        title: 'Adjust your cart',
        description: `${unavailable.product?.name ?? 'One product'} (${unavailable.variant?.label ?? 'selected weight'}) only has ${unavailable.variant?.inventory ?? 0} in stock.`,
        variant: 'destructive'
      })
      setIsProcessingPayment(false)
      return
    }

    if (cart.length === 0) {
      toast({ title: 'Your cart is empty', description: 'Add products before checking out.' })
      setIsProcessingPayment(false)
      return
    }

    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Login required')
      const { data: sessionData } = await supabase.auth.getSession()
      accessToken = sessionData.session?.access_token ?? undefined
      if (!accessToken) throw new Error('Session expired')
      const isCod = paymentMethod.id === 'cod'

      const address_snapshot = { ...values }
      const itemsPayload = cart.map((item) => ({ product_id: item.product_id, variant_id: item.variant_id, quantity: item.quantity }))

      let serverTotal = total

      const { data: orderResult, error: orderError } = await supabase.rpc('create_order_with_items', {
        p_currency: 'INR',
        p_address: address_snapshot,
        p_items: itemsPayload,
        p_shipping_cents: shippingCents,
        p_shipping_option: selectedShipping.id,
        p_coupon_code: couponState?.code ?? null,
        p_payment_method: isCod ? 'cod' : 'online'
      })
      if (orderError) throw orderError
      orderId = orderResult?.order_id as string | undefined
      if (!orderId) throw new Error('Order could not be created')

      if (orderResult?.discount_cents !== undefined && couponState) {
        setCouponState({ code: couponState.code, discount_cents: orderResult.discount_cents })
      }
      serverTotal = orderResult?.total_cents ?? total

      if (isCod) {
        try {
          await fetch('/api/orders/confirm-cod', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ orderId })
          })
        } catch (err) {
          console.error('Failed to confirm COD order', err)
        }
        const { data: auth2 } = await supabase.auth.getUser()
        if (auth2.user) await supabase.from('cart_items').delete().eq('user_id', auth2.user.id)
        toast({ title: 'Order placed with Cash on Delivery', description: 'We will confirm your order shortly.' })
        window.location.href = '/account?payment=cod'
        return
      }

      const Razorpay = await ensureRazorpay()

      const resp = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ receipt: orderId })
      })

      const payload = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const rawMessage = (payload as { error?: unknown })?.error
        const serverMessage = typeof rawMessage === 'string' ? rawMessage : rawMessage ? JSON.stringify(rawMessage) : `HTTP ${resp.status}`
        throw new Error(`Could not create Razorpay order (${serverMessage})`)
      }

      const { orderId: razorpayOrderId, keyId, amount: verifiedAmount, currency: verifiedCurrency } = payload as { orderId?: string; keyId?: string; amount?: number; currency?: string }
      if (!razorpayOrderId || !keyId) throw new Error('Razorpay order response incomplete')
      const payableCents = verifiedAmount ?? serverTotal
      const payableCurrency = verifiedCurrency ?? 'INR'

      const rp = new Razorpay({
        key: keyId,
        amount: payableCents,
        currency: payableCurrency,
        name: 'Nidhis Dry Fruits',
        description: 'Order payment',
        order_id: razorpayOrderId,
        prefill: { name: values.name, contact: values.phone, email: auth.user.email ?? undefined },
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            const verifyResp = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                orderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              })
            })
            if (!verifyResp.ok) throw new Error('Payment verification failed')

            const { data: auth2 } = await supabase.auth.getUser()
            if (auth2.user) await supabase.from('cart_items').delete().eq('user_id', auth2.user.id)
            window.location.href = '/account'
          } catch (err) {
            console.error(err)
            window.location.href = '/checkout?payment=failed'
          }
        },
        theme: { color: '#0E7C4A' },
        modal: {
          ondismiss: () => {
            void fetch('/api/orders/cancel', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({ orderId })
            }).catch((error) => console.error('Failed to cancel order', error))
          }
        }
      })
      rp.open()
    } catch (err: any) {
      console.error('Checkout submission failed', err)
      const description = err?.message ?? 'Please try again'
      toast({ title: 'Could not start payment', description, variant: 'destructive' })
      if (orderId && accessToken) {
        void fetch('/api/orders/cancel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ orderId })
        }).catch((error) => console.error('Failed to cancel order after error', error))
      }
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-inter">
      <Header />
      <CartButtonPanel />
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-bold font-playfair text-green mb-6">Checkout</h1>
        {isLoading ? <div className="text-neutral-500">Loading cart...</div> : cart.length === 0 ? <div className="text-neutral-500">Your cart is empty.</div> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-4">
              {savedAddresses.length > 0 && (
                <div className="border rounded-lg p-3 bg-white space-y-2">
                  <div className="flex items-center justify-between text-sm text-neutral-700">
                    <span>Saved addresses</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      const defaultAddress = savedAddresses.find((addr) => addr.is_default) ?? savedAddresses[0]
                      if (defaultAddress) fillSavedAddress(defaultAddress)
                    }}>Use default</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((addr) => (
                      <Button
                        key={addr.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillSavedAddress(addr)}
                      >
                        {addr.name} • {addr.city}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Full name" className="input" {...register('name')} />
                <input placeholder="Phone" className="input" {...register('phone')} />
                <input placeholder="Address line 1" className="input md:col-span-2" {...register('line1')} />
                <input placeholder="Address line 2 (optional)" className="input md:col-span-2" {...register('line2')} />
                <input placeholder="City" className="input" {...register('city')} />
                <input placeholder="State" className="input" {...register('state')} />
                <input placeholder="Pincode" className="input" {...register('pincode')} />
              </div>
              {Object.values(errors).length > 0 && <div className="text-sm text-rose-600">Please fill all required fields</div>}
              {outOfStockItems.length > 0 && (
                <div className="text-sm text-rose-600">
                  {outOfStockItems.map((item) => (
                    <div key={item.id}>
                      {item.product?.name ?? 'Product'} ({item.variant?.label ?? 'selected weight'}) only has {item.variant?.inventory ?? 0} left.
                    </div>
                  ))}
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-neutral-700">Payment method</h3>
                <div className="mt-2 space-y-2">
                  {PAYMENT_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors ${paymentMethod.id === option.id ? 'border-green bg-green/5' : 'border-neutral-200 hover:border-green/50'}`}
                    >
                      <span className="text-sm text-neutral-700">{option.label}</span>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={paymentMethod.id === option.id}
                        onChange={() => setPaymentMethod(option)}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={!canSubmit} className="bg-green text-white hover:bg-green/85 disabled:bg-neutral-400">
                {isProcessingPayment
                  ? 'Preparing checkout…'
                  : paymentMethod.id === 'cod'
                    ? 'Place COD order'
                    : 'Pay with Razorpay'}
              </Button>
            </form>
            <aside className="bg-white rounded-xl shadow-card border p-4 h-fit space-y-4">
              <h2 className="font-semibold">Order Summary</h2>
              <ul className="space-y-2">
                {cart.map((r) => (
                  <li key={r.id} className="flex justify-between text-sm">
                    <span>
                      {r.product?.name ?? 'Product'}{r.variant?.label ? ` • ${r.variant.label}` : ''} × {r.quantity}
                      {(r.variant?.inventory ?? 0) < r.quantity && <span className="text-rose-500 ml-2">({r.variant?.inventory ?? 0} available)</span>}
                    </span>
                    <span>{formatInrFromCents((r.variant?.price_cents ?? 0) * r.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-4 border-t pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700">Shipping method</h3>
                  <div className="mt-2 space-y-2">
                    {SHIPPING_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors ${selectedShipping.id === option.id ? 'border-green bg-green/5' : 'border-neutral-200 hover:border-green/50'}`}
                      >
                        <span className="text-sm text-neutral-700">{option.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-neutral-800">{formatInrFromCents(option.amount)}</span>
                          <input
                            type="radio"
                            className="sr-only"
                            checked={selectedShipping.id === option.id}
                            onChange={() => setSelectedShipping(option)}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700">Coupon</h3>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="SAVE10"
                      className="flex-1"
                      disabled={!!couponState}
                    />
                    {couponState ? (
                      <Button variant="outline" onClick={() => { setCouponState(null); setCouponCode('') }}>Remove</Button>
                    ) : (
                      <Button onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode.trim()}>
                        {isApplyingCoupon ? 'Applying…' : 'Apply'}
                      </Button>
                    )}
                  </div>
                  {couponState && (
                    <p className="text-xs text-green-600 mt-1">Coupon {couponState.code} applied. You save {formatInrFromCents(discountCents)}.</p>
                  )}
                </div>
              </div>
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatInrFromCents(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span>Shipping</span><span>{formatInrFromCents(shippingCents)}</span></div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-sm text-green-700"><span>Discount{couponState?.code ? ` (${couponState.code})` : ''}</span><span>-{formatInrFromCents(discountCents)}</span></div>
                )}
                <div className="flex justify-between text-sm text-neutral-700"><span>Payment</span><span>{paymentMethod.id === 'cod' ? 'Cash on Delivery' : 'Online (Razorpay)'}</span></div>
                <div className="flex justify-between font-semibold text-base mt-1"><span>Total</span><span>{formatInrFromCents(total)}</span></div>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
      <style>{`.input{border:1px solid rgba(14,124,74,.2);border-radius:.5rem;padding:.6rem .8rem;}`}</style>
    </div>
  )
}
