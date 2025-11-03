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
  quantity: number
  added_at: string
  product: {
    id: string
    name: string
    image_url: string | null
    price_cents: number
    inventory: number | null
  } | null
}

const fetchCartItems = async (): Promise<CartItem[]> => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const userId = authData.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from("cart_items")
    .select("id, product_id, quantity, added_at")
    .eq("user_id", userId)
    .order("added_at", { ascending: false })

  if (error) throw error
  if (!data || data.length === 0) return []

  const productIds = Array.from(new Set(data.map((item) => item.product_id)))
  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id, name, image_url, price_cents, inventory")
    .in("id", productIds)

  if (productError) throw productError

  const productById = new Map((productRows ?? []).map((product) => [product.id, product]))

  return data.map((item) => ({
    ...item,
    product: productById.get(item.product_id) ?? null,
  }))
}

const removeCartItem = async (id: string) => {
  const { error } = await supabase.from("cart_items").delete().eq("id", id)
  if (error) throw error
}

const updateCartItemQty = async ({ id, qty, product_id }: { id: string; qty: number; product_id: string }) => {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('inventory, name')
    .eq('id', product_id)
    .maybeSingle()
  if (productError) throw productError
  const available = product?.inventory ?? 0
  if (qty > available) {
    throw new Error(`Only ${available} left for ${product?.name ?? 'this product'}`)
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
      const unit = item.product?.price_cents ?? 0
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
              const lineTotal = (product?.price_cents ?? 0) * item.quantity

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
                      <div className="text-sm text-neutral-500">
                        {formatInrFromCents(product?.price_cents ?? 0)} each
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (item.quantity > 1) {
                          qtyMutation.mutate({ id: item.id, qty: item.quantity - 1, product_id: item.product_id })
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
                        const max = item.product?.inventory ?? Number.POSITIVE_INFINITY
                        if (item.product && max !== null && max !== undefined && item.quantity >= max) {
                          toast({
                            title: 'Limit reached',
                            description: `Only ${max} left in stock`,
                            variant: 'destructive'
                          })
                          return
                        }
                        qtyMutation.mutate({ id: item.id, qty: item.quantity + 1, product_id: item.product_id })
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
                  {item.product?.inventory !== null && item.quantity >= (item.product.inventory ?? 0) && (
                    <p className="text-xs text-rose-500 mt-2">Only {item.product.inventory} left in stock.</p>
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
