import React from "react"
import { Button } from "@/components/ui/button"
import ImageWithFallback from "@/components/ImageWithFallback"
import { formatInrFromCents } from "@/lib/utils"
import { useProducts } from "@/hooks/useProducts"
import { useAddToCart } from "@/hooks/useAddToCart"

const FrequentlyBought = () => {
  const { data: rows = [], isLoading, error } = useProducts("Bestsellers")
  const addToCart = useAddToCart()

  const products = rows.slice(0, 6).map((row) => ({
    id: row.id,
    name: row.name,
    image: row.image_url ?? "/placeholder.svg",
    priceCents: row.price_cents,
    slug: row.slug ?? undefined,
    originalPriceCents: row.mrp_cents ?? undefined,
  }))

  return (
    <section className="py-16 bg-white" id="frequently-bought">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-playfair font-bold text-center text-saffron mb-3">
          Frequently Bought Products
        </h2>
        <p className="text-neutral-700 text-center max-w-2xl mx-auto mb-8">
          Popular picks and festive favorites, trusted and loved by our customers.
        </p>
        {error ? (
          <div className="text-center text-red-500">Could not load featured products.</div>
        ) : isLoading ? (
          <div className="text-center text-neutral-500">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center text-neutral-500">No featured products yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-xl bg-neutral-50 shadow-card hover:shadow-lg transition-shadow hover:-translate-y-1 p-4 flex flex-col items-center border border-gold/10 group"
              >
                <div className="overflow-hidden rounded-lg mb-3 w-40 h-40 bg-neutral-200 flex items-center justify-center">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex flex-col flex-1 items-center justify-between w-full">
                  <h3 className="text-lg font-bold font-playfair text-green mb-1 text-center">{product.name}</h3>
                  <p className="text-saffron font-semibold text-base mb-2">{formatInrFromCents(product.priceCents)}</p>
                  <Button
                    className="bg-green text-white hover:bg-green/80 mt-auto px-6"
                    onClick={() => addToCart.mutate({ product_id: product.id, quantity: 1 })}
                    disabled={addToCart.isPending}
                  >
                    Add to cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default FrequentlyBought
