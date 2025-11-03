import React from "react"
import { supabase } from "@/integrations/supabase/client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "./ui/button"
import ImageWithFallback from "@/components/ImageWithFallback"
import { formatInrFromCents } from "@/lib/utils"

type WishlistItem = {
  id: string
  product_id: string
  added_at: string
  product: {
    id: string
    name: string
    image_url: string | null
    price_cents: number
  } | null
}

const fetchWishlistItems = async (): Promise<WishlistItem[]> => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const userId = authData.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from("wishlists")
    .select("id, product_id, added_at")
    .eq("user_id", userId)
    .order("added_at", { ascending: false })

  if (error) throw error
  if (!data || data.length === 0) return []

  const productIds = Array.from(new Set(data.map((item) => item.product_id)))
  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id, name, image_url, price_cents")
    .in("id", productIds)

  if (productError) throw productError

  const productById = new Map((productRows ?? []).map((product) => [product.id, product]))

  return data.map((item) => ({
    ...item,
    product: productById.get(item.product_id) ?? null,
  }))
}

const removeWishlistItem = async (id: string) => {
  const { error } = await supabase.from("wishlists").delete().eq("id", id)
  if (error) throw error
}

const Wishlist: React.FC = () => {
  const queryClient = useQueryClient()
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["wishlist-items"],
    queryFn: fetchWishlistItems,
  })

  const mutation = useMutation({
    mutationFn: removeWishlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items"] })
    },
  })

  if (isLoading) return <div>Loading wishlist...</div>
  if (error) return <div>Error loading wishlist.</div>

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 font-playfair text-saffron">Your Wishlist</h1>
      {data.length === 0 ? (
        <div className="text-neutral-500">Your wishlist is empty.</div>
      ) : (
        <ul className="space-y-6">
          {data.map((item) => {
            const product = item.product
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
                      {formatInrFromCents(product?.price_cents ?? 0)}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => mutation.mutate(item.id)}
                  disabled={mutation.isPending}
                >
                  Remove
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Wishlist
