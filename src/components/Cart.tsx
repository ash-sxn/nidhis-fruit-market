import React from "react"
import { supabase } from "@/integrations/supabase/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "./ui/button"
import { Plus, Minus, ShoppingBag } from "lucide-react"
import { Link } from "react-router-dom"
import ImageWithFallback from "@/components/ImageWithFallback"
import { formatInrFromCents } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

type CartItem = {
  id: string
  product_id: string
  variant_id: string
  quantity: number
  added_at: string
  product: {
    id: string
    name: string
    image_url: string | null
  } | null
  variant: {
    id: string
    label: string
    price_cents: number
    mrp_cents: number | null
    inventory: number | null
    grams: number | null
  } | null
}

const fetchCartItems = async (): Promise<CartItem[]> => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const userId = authData.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from("cart_items")
    .select(`
      id,
      product_id,
      variant_id,
      quantity,
      added_at,
      product:products(id,name,image_url),
      variant:product_variants(id,label,price_cents,mrp_cents,inventory,grams)
    `)
    .eq("user_id", userId)
    .order("added_at", { ascending: false })

  if (error) throw error
  if (!data) return []

  return data.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    added_at: item.added_at,
    product: (item as any).product ?? null,
    variant: (item as any).variant ?? null,
  }))
}

const removeCartItem = async (id: string) => {
  const { error } = await supabase.from("cart_items").delete().eq("id", id)
  if (error) throw error
}

const updateCartItemQty = async ({ id, qty, product_id, variant_id }: { id: string; qty: number; product_id: string; variant_id: string }) => {
  const { data: variant, error: variantError } = await supabase
    .from('product_variants')
    .select('inventory, label')
    .eq('id', variant_id)
    .maybeSingle()
  if (variantError) throw variantError
  const available = variant?.inventory ?? 0
  if (qty > available) {
    throw new Error(`Only ${available} left for ${variant?.label ?? 'this option'}`)
  }
  const { error } = await supabase.from('cart_items').update({ quantity: qty }).eq('id', id)
  if (error) throw error
}

const Cart: React.FC = () => {
  const queryClient = useQueryClient()
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["cart-items"],
    queryFn: fetchCartItems,
  })

  const removeMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-items"] })
    },
  })

  const qtyMutation = useMutation({
    mutationFn: updateCartItemQty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-items"] })
    },
    onError: (err: any) => {
      toast({ title: 'Could not update quantity', description: err?.message ?? 'Try again later', variant: 'destructive' })
    }
  })

  if (isLoading) return <div>Loading cart...</div>
  if (error) return <div>Error loading cart.</div>

  const totals = data.reduce(
    (acc, item) => {
      const unit = item.variant?.price_cents ?? 0
      const line = unit * item.quantity
      return {
        subtotal: acc.subtotal + line,
        items: acc.items + item.quantity,
      }
    },
    { subtotal: 0, items: 0 }
  )

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 font-playfair text-saffron">Your Cart</h1>
      {data.length === 0 ? (
        <div className="text-center text-neutral-500 flex flex-col items-center gap-4">
          <ShoppingBag className="w-16 h-16 text-saffron/60" />
          <p>Your cart is empty.</p>
          <Button asChild>
            <Link to="/">Browse products</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-6">
            {data.map((item) => {
              const product = item.product
              const variant = item.variant
              const lineTotal = (variant?.price_cents ?? 0) * item.quantity

              return (
                <li key={item.id} className="flex items-center justify-between border rounded-md p-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded overflow-hidden bg-neutral-100 flex items-center justify-center">
                      <ImageWithFallback
                        src={product?.image_url ?? "/placeholder.svg"}
                        alt={product?.name ?? "Product"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold">{product?.name ?? "Unknown product"}</div>
                      {variant?.label && (
                        <div className="text-xs text-neutral-500">{variant.label}</div>
                      )}
                      <div className="text-sm text-neutral-500">
                        {formatInrFromCents(variant?.price_cents ?? 0)} each
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (item.quantity > 1) {
                          qtyMutation.mutate({ id: item.id, qty: item.quantity - 1, product_id: item.product_id, variant_id: item.variant_id })
                        } else {
                          removeMutation.mutate(item.id)
                        }
                      }}
                      disabled={qtyMutation.isPending || removeMutation.isPending}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span>{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const max = item.variant?.inventory ?? Number.POSITIVE_INFINITY
                        if (item.variant && max !== null && max !== undefined && item.quantity >= max) {
                          toast({
                            title: 'Limit reached',
                            description: `Only ${max} left in stock`,
                            variant: 'destructive'
                          })
                          return
                        }
                        qtyMutation.mutate({ id: item.id, qty: item.quantity + 1, product_id: item.product_id, variant_id: item.variant_id })
                      }}
                      disabled={qtyMutation.isPending}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <div className="w-24 text-right text-sm font-medium">{formatInrFromCents(lineTotal)}</div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                  {item.variant?.inventory !== null && item.quantity >= (item.variant.inventory ?? 0) && (
                    <p className="text-xs text-rose-500 mt-2">Only {item.variant.inventory} left in stock.</p>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="mt-6 flex justify-between items-center border-t pt-4">
            <div className="text-sm text-neutral-600">{totals.items} item{totals.items === 1 ? "" : "s"}</div>
            <div className="text-lg font-semibold">Subtotal: {formatInrFromCents(totals.subtotal)}</div>
          </div>
        </>
      )}
      <div className="mt-8">
        <Button asChild>
          <a href="/checkout">Checkout</a>
        </Button>
      </div>
    </div>
  )
}

export default Cart
