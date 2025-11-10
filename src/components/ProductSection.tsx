import React from "react"
import { Button } from "@/components/ui/button"
import ImageWithFallback from "@/components/ImageWithFallback"
import { productIdFromName } from "@/lib/product-id"
import { formatInrFromCents } from "@/lib/utils"
import { Heart, ShoppingCart } from "lucide-react"
import { useAddToCart } from "@/hooks/useAddToCart"
import { useAddToWishlist } from "@/hooks/useAddToWishlist"
import { Link } from "react-router-dom"
import { toast } from "@/components/ui/use-toast"

export type ProductSectionItem = {
  id?: string
  name: string
  image?: string | null
  priceCents: number
  originalPriceCents?: number | null
  slug?: string
  description?: string
  inventory?: number | null
  variantId?: string | null
  variantLabel?: string | null
}

interface ProductSectionProps {
  title: string
  products: ProductSectionItem[]
  viewAllLink?: string
}

const resolveProductId = (product: ProductSectionItem) =>
  product.id ?? productIdFromName(product.name)

const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  products,
  viewAllLink,
}) => {
  const addToCart = useAddToCart()
  const addToWishlist = useAddToWishlist()

  const handleAddToCart = (product: ProductSectionItem) => {
    const product_id = resolveProductId(product)
    if (!product.variantId) {
      toast({ title: 'Select weight on product page', description: 'Open the product details to choose a pack size.', variant: 'destructive' })
      return
    }
    addToCart.mutate({ product_id, variant_id: product.variantId, quantity: 1 })
  }

  const handleAddToWishlist = (product: ProductSectionItem) => {
    const product_id = resolveProductId(product)
    addToWishlist.mutate({ product_id })
  }

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-playfair font-bold text-green">{title}</h2>
          {viewAllLink && (
            <a
              href={viewAllLink}
              className="px-4 py-2 rounded-full bg-green text-white font-bold text-sm shadow hover:bg-green/80 transition-colors"
            >
              View All Products
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product) => {
            const primaryPrice = formatInrFromCents(product.priceCents)
            const hasSale = product.originalPriceCents != null && product.originalPriceCents > product.priceCents
            const salePrice = hasSale ? formatInrFromCents(product.originalPriceCents!) : null
            const isOutOfStock = product.inventory !== undefined && product.inventory !== null && product.inventory <= 0

            const productUrl = product.slug ? `/product/${product.slug}` : undefined

            const imageNode = (
              <div className="overflow-hidden rounded-lg mb-3 w-40 h-40 bg-neutral-200 flex items-center justify-center mx-auto">
                <ImageWithFallback
                  src={product.image ?? '/placeholder.svg'}
                  alt={product.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
            )

            const titleNode = (
              <h3 className="text-base font-bold font-playfair text-green mb-1 text-center">{product.name}</h3>
            )

            return (
              <div
                key={resolveProductId(product)}
                data-testid="product-card"
                className="rounded-xl bg-neutral-50 shadow-card hover:shadow-lg transition-shadow hover:-translate-y-1 p-4 flex flex-col items-center border border-gold/10 group"
              >
                {productUrl ? (
                  <Link to={productUrl} className="block w-full">
                    {imageNode}
                  </Link>
                ) : (
                  imageNode
                )}
                {productUrl ? (
                  <Link to={productUrl} className="block w-full">
                    {titleNode}
                  </Link>
                ) : (
                  titleNode
                )}
                <div className="mb-2 text-center">
                  <span className="text-green font-semibold text-base">{primaryPrice}</span>
                  {salePrice && (
                    <>
                      <span className="text-neutral-400 line-through text-sm ml-1">{salePrice}</span>
                      <span className="ml-1 bg-green/10 text-xs px-2 py-0.5 rounded text-green font-medium">Sale!</span>
                    </>
                  )}
                </div>
                <div className="flex gap-3 items-center w-full mt-auto">
                  <Button
                    className="bg-green text-white hover:bg-green/80 px-4 flex-1 disabled:bg-neutral-400"
                    onClick={() => handleAddToCart(product)}
                    disabled={addToCart.isPending || isOutOfStock || !product.variantId}
                  >
                    {isOutOfStock ? 'Out of stock' : <><ShoppingCart className="mr-2 w-4 h-4" /> Add to cart</>}
                  </Button>
                  <button
                    className="rounded-full p-2 border border-green bg-white hover:bg-green/10 text-green transition-colors flex items-center"
                    title="Add to wishlist"
                    onClick={() => handleAddToWishlist(product)}
                    disabled={addToWishlist.isPending || isOutOfStock}
                    type="button"
                  >
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
                {isOutOfStock && (
                  <p className="mt-2 text-xs text-rose-500">Restocking soon</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default ProductSection
