import React from "react"
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

type CartRow = { id: string; product_id: string; quantity: number; product?: { id: string; name: string; price_cents: number } | null }

async function fetchCartWithProducts(): Promise<CartRow[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return []
  const { data, error } = await supabase
    .from('cart_items')
    .select('id,product_id,quantity')
    .eq('user_id', uid)
    .order('added_at', { ascending: false })
  if (error) throw error
  if (!data || data.length === 0) return []
  const ids = Array.from(new Set(data.map(r => r.product_id)))
  const { data: products } = await supabase.from('products').select('id,name,price_cents').in('id', ids)
  const map = new Map((products ?? []).map(p => [p.id, p]))
  return data.map(r => ({ ...r, product: map.get(r.product_id) ?? null }))
}

export default function CheckoutPage() {
  const { data: cart = [], isLoading } = useQuery({ queryKey: ['cart-with-products'], queryFn: fetchCartWithProducts })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AddressInput>({ resolver: zodResolver(AddressSchema) })

  const subtotal = cart.reduce((sum, r) => sum + (r.product?.price_cents ?? 0) * r.quantity, 0)
  const shipping = 0
  const total = subtotal + shipping

  const onSubmit = async (values: AddressInput) => {
    const Razorpay = await ensureRazorpay()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Login required')

    const address_snapshot = { ...values }
    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert({ user_id: auth.user.id, total_cents: total, currency: 'INR', address_snapshot, status: 'pending' })
      .select('id')
      .single()
    if (orderError) throw orderError

    const items = cart.map(r => ({
      order_id: orderRow.id,
      product_id: r.product_id,
      name_snapshot: r.product?.name ?? 'Product',
      price_cents_snapshot: r.product?.price_cents ?? 0,
      quantity: r.quantity,
    }))
    if (items.length) await supabase.from('order_items').insert(items)

    const resp = await fetch('/api/razorpay/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: total, currency: 'INR', receipt: orderRow.id }) })
    if (!resp.ok) throw new Error('Could not create Razorpay order')
    const { orderId, keyId } = await resp.json()

    const rp = new Razorpay({
      key: keyId,
      amount: total,
      currency: 'INR',
      name: 'Nidhis Dry Fruits',
      description: 'Order payment',
      order_id: orderId,
      prefill: { name: values.name, contact: values.phone, email: auth.user.email ?? undefined },
      handler: async (response: RazorpayPaymentResponse) => {
        await supabase.from('orders').update({ status: 'paid', payment_ref: response.razorpay_payment_id }).eq('id', orderRow.id)
        const { data: auth2 } = await supabase.auth.getUser()
        if (auth2.user) await supabase.from('cart_items').delete().eq('user_id', auth2.user.id)
        window.location.href = '/account'
      },
      theme: { color: '#0E7C4A' },
      modal: {
        ondismiss: () => {
          void supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderRow.id)
        }
      }
    })
    rp.open()
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
              <Button type="submit" disabled={isSubmitting} className="bg-green text-white hover:bg-green/85">Pay with Razorpay</Button>
            </form>
            <aside className="bg-white rounded-xl shadow-card border p-4 h-fit">
              <h2 className="font-semibold mb-3">Order Summary</h2>
              <ul className="space-y-2 mb-3">
                {cart.map((r) => (
                  <li key={r.id} className="flex justify-between text-sm">
                    <span>{r.product?.name ?? 'Product'} × {r.quantity}</span>
                    <span>{formatInrFromCents((r.product?.price_cents ?? 0) * r.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatInrFromCents(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span>Shipping</span><span>{formatInrFromCents(shipping)}</span></div>
              <div className="flex justify-between font-semibold mt-2"><span>Total</span><span>{formatInrFromCents(total)}</span></div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
      <style>{`.input{border:1px solid rgba(14,124,74,.2);border-radius:.5rem;padding:.6rem .8rem;}`}</style>
    </div>
  )
}

