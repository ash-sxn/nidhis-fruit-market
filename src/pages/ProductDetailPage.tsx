import React, { useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FadeInOnScroll from '@/components/FadeInOnScroll'
import CartButtonPanel from '@/components/CartButtonPanel'
import { useProductBySlug } from '@/hooks/useProduct'
import { formatInrFromCents } from '@/lib/utils'
import ImageWithFallback from '@/components/ImageWithFallback'
import { useAddToCart } from '@/hooks/useAddToCart'
import { useAddToWishlist } from '@/hooks/useAddToWishlist'
import { Heart, ShoppingCart } from 'lucide-react'
import ProductSection from '@/components/ProductSection'
import { useProducts } from '@/hooks/useProducts'

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const { data: product, isLoading, error } = useProductBySlug(slug)
  const addToCart = useAddToCart()
  const addToWishlist = useAddToWishlist()
  const { data: categoryProducts = [] } = useProducts(product?.category, { enabled: Boolean(product?.category) })

  const description = useMemo(() => {
    if (!product) return 'Discover premium dry fruits sourced by Nidhis.'
    const fallback = `${product.name} from Nidhis ${product.category} collection. Fresh, carefully sourced, and delivered across India.`
    return product.description?.trim() ? product.description : fallback
  }, [product])

  const productJsonLd = useMemo(() => {
    if (!product) return null
    const price = (product.price_cents / 100).toFixed(2)
    const images = product.image_url ? [product.image_url] : undefined
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: images,
      description: description,
      category: product.category,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price,
        availability: 'https://schema.org/InStock'
      }
    }
  }, [product])

  useEffect(() => {
    if (product?.name) {
      document.title = `${product.name} | Nidhis Dry Fruits`
    }
    if (description) {
      const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
      if (meta) {
        meta.setAttribute('content', description)
      }
    }
  }, [product?.name, description])

  const handleAddToCart = () => {
    if (!product?.id) return
    addToCart.mutate({ product_id: product.id, quantity: 1 })
  }

  const handleAddToWishlist = () => {
    if (!product?.id) return
    addToWishlist.mutate({ product_id: product.id })
  }

  const relatedProducts = (categoryProducts ?? [])
    .filter((item) => item.id !== product?.id)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image_url ?? '/placeholder.svg',
      priceCents: item.price_cents,
      slug: item.slug ?? undefined,
    }))

  return (
    <div className="flex flex-col min-h-screen bg-background font-inter">
      <Header />
      <CartButtonPanel />
      <main className="flex-1">
        <div className="container mx-auto max-w-5xl px-4 py-10">
          {isLoading ? (
            <div className="min-h-[40vh] flex items-center justify-center text-neutral-500">Loading product...</div>
          ) : error ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center text-red-500">
              <p>Could not load product details.</p>
              <Link to="/" className="mt-4 underline text-green">Go back home</Link>
            </div>
          ) : !product ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center text-neutral-500">
              <p>We couldn&apos;t find that product.</p>
              <Link to="/" className="mt-4 underline text-green">Browse our catalogue</Link>
            </div>
          ) : (
            <FadeInOnScroll>
              {productJsonLd && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white rounded-2xl shadow-card border border-gold/10 overflow-hidden">
                  <ImageWithFallback
                    src={product.image_url ?? '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover max-h-[480px]"
                  />
                </div>
                <div className="flex flex-col gap-6">
                  <div>
                    <div className="text-sm uppercase tracking-wide text-saffron/80 font-semibold">
                      {product.category}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-playfair font-bold text-green mt-2">
                      {product.name}
                    </h1>
                    <div className="flex items-baseline gap-3 mt-4">
                      <p className="text-2xl font-semibold text-saffron">
                        {formatInrFromCents(product.price_cents)}
                      </p>
                      {product.mrp_cents && product.mrp_cents > product.price_cents && (
                        <span className="text-neutral-400 line-through">{formatInrFromCents(product.mrp_cents)}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 text-neutral-700">
                    <p>{description}</p>
                    <p>
                      Need bulk or gifting options? Reach out to our team for customised hampers and corporate gifting support.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button
                      className="inline-flex items-center justify-center rounded-full bg-green text-white px-6 py-3 font-semibold shadow hover:bg-green/85 transition-colors"
                      onClick={handleAddToCart}
                      disabled={addToCart.isPending}
                      type="button"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" /> Add to cart
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-full border border-green text-green px-6 py-3 font-semibold hover:bg-green/10 transition-colors"
                      onClick={handleAddToWishlist}
                      disabled={addToWishlist.isPending}
                      type="button"
                    >
                      <Heart className="w-5 h-5 mr-2" /> Add to wishlist
                    </button>
                  </div>
                  <div className="text-sm text-neutral-500 space-y-1">
                    <p>• 100% natural ingredients</p>
                    <p>• Secure packaging to maintain crunch and aroma</p>
                    <p>• Fast shipping across India</p>
                    {typeof product.inventory === 'number' && product.inventory <= 10 && (
                      <p className="text-rose-500 font-medium">Only {product.inventory} left in stock</p>
                    )}
                  </div>
                </div>
              </div>
            </FadeInOnScroll>
          )}
        </div>
        {product && relatedProducts.length > 0 && (
          <FadeInOnScroll delay={0.15}>
            <ProductSection title="You may also like" products={relatedProducts} />
          </FadeInOnScroll>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default ProductDetailPage
