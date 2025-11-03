import React, { useMemo } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { supabase } from "@/integrations/supabase/client"
import { useQuery } from "@tanstack/react-query"
import ImageWithFallback from "@/components/ImageWithFallback"
import { formatInrFromCents } from "@/lib/utils"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { categories as categoryList } from "@/config/categories"
import { Heart, ShoppingCart } from "lucide-react"
import { useAddToCart } from "@/hooks/useAddToCart"
import { useAddToWishlist } from "@/hooks/useAddToWishlist"

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' }
]

const availabilityOptions = [
  { value: 'all', label: 'All' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'out-of-stock', label: 'Out of stock' }
]

type FilterState = {
  search: string
  category: string
  availability: string
  sort: string
}

type ProductRow = {
  id: string
  name: string
  slug: string | null
  category: string
  price_cents: number
  mrp_cents: number | null
  inventory: number | null
  image_url: string | null
  updated_at: string
}

async function fetchProducts(filters: FilterState): Promise<ProductRow[]> {
  let query = supabase
    .from('products')
    .select('id,name,slug,category,price_cents,mrp_cents,inventory,image_url,updated_at')
    .eq('is_active', true)
    .limit(60)

  if (filters.category) {
    query = query.eq('category', filters.category)
  }

  if (filters.availability === 'in-stock') {
    query = query.gt('inventory', 0)
  } else if (filters.availability === 'out-of-stock') {
    query = query.eq('inventory', 0)
  }

  const term = filters.search.trim()
  if (term.length > 0) {
    if (term.length >= 2) {
      query = query.textSearch('search_document', term, { config: 'english', type: 'websearch' })
    } else {
      query = query.ilike('name', `%${term}%`)
    }
  }

  switch (filters.sort) {
    case 'price-asc':
      query = query.order('price_cents', { ascending: true })
      break
    case 'price-desc':
      query = query.order('price_cents', { ascending: false })
      break
    case 'newest':
      query = query.order('updated_at', { ascending: false })
      break
    default:
      query = query.order('updated_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo<FilterState>(() => ({
    search: searchParams.get('q') ?? '',
    category: searchParams.get('category') ?? '',
    availability: searchParams.get('availability') ?? 'all',
    sort: searchParams.get('sort') ?? 'featured'
  }), [searchParams])

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-index', filters],
    queryFn: () => fetchProducts(filters),
  })

  const addToCart = useAddToCart()
  const addToWishlist = useAddToWishlist()

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'all' || value === 'featured') {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    setSearchParams(next)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-inter">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-playfair text-green mb-6">Browse Products</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          <aside className="space-y-6">
            <div>
              <h2 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-3">Search</h2>
              <input
                className="w-full rounded-md border border-green/40 px-3 py-2"
                placeholder="Search by name..."
                value={filters.search}
                onChange={(e) => updateParam('q', e.target.value)}
              />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-3">Categories</h2>
              <div className="space-y-2">
                <button
                  className={`block w-full text-left px-3 py-2 rounded-md ${!filters.category ? 'bg-green/10 text-green' : 'hover:bg-neutral-100'}`}
                  onClick={() => updateParam('category', '')}
                >
                  All categories
                </button>
                {categoryList.map((category) => (
                  <button
                    key={category.slug}
                    className={`block w-full text-left px-3 py-2 rounded-md ${filters.category === category.label ? 'bg-green/10 text-green' : 'hover:bg-neutral-100'}`}
                    onClick={() => updateParam('category', category.label)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-3">Availability</h2>
              <div className="space-y-2">
                {availabilityOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`block w-full text-left px-3 py-2 rounded-md ${filters.availability === option.value ? 'bg-green/10 text-green' : 'hover:bg-neutral-100'}`}
                    onClick={() => updateParam('availability', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-sm text-neutral-500 uppercase tracking-wide mb-3">Sort by</h2>
              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`block w-full text-left px-3 py-2 rounded-md ${filters.sort === option.value ? 'bg-green/10 text-green' : 'hover:bg-neutral-100'}`}
                    onClick={() => updateParam('sort', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
          <section>
            {isLoading ? (
              <div className="text-neutral-500">Loading products…</div>
            ) : products.length === 0 ? (
              <div className="text-neutral-500">No products matched your filters.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                  const price = formatInrFromCents(product.price_cents)
                  const hasStock = (product.inventory ?? 0) > 0
                  return (
                    <div key={product.id} className="rounded-xl bg-white border border-gold/10 shadow-card p-4 flex flex-col">
                      <div className="w-full aspect-square mb-3 overflow-hidden rounded-lg bg-neutral-100 flex items-center justify-center">
                        <ImageWithFallback src={product.image_url ?? '/placeholder.svg'} alt={product.name} className="object-cover w-full h-full" />
                      </div>
                      <div className="text-xs uppercase tracking-wide text-saffron/80 mb-1">{product.category}</div>
                      <h3 className="font-semibold font-playfair text-lg text-green mb-1">{product.name}</h3>
                      <div className="text-saffron font-semibold mb-3">{price}</div>
                      {!hasStock && <div className="text-xs text-rose-500 mb-3">Out of stock</div>}
                      <div className="mt-auto flex gap-3 items-center">
                        <Button
                          className="bg-green text-white hover:bg-green/85 flex-1 disabled:bg-neutral-400"
                          onClick={() => addToCart.mutate({ product_id: product.id })}
                          disabled={!hasStock || addToCart.isPending}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" /> Add to cart
                        </Button>
                        <button
                          className="rounded-full p-2 border border-green bg-white hover:bg-green/10 text-green transition-colors flex items-center"
                          title="Add to wishlist"
                          onClick={() => addToWishlist.mutate({ product_id: product.id })}
                          disabled={!hasStock || addToWishlist.isPending}
                          type="button"
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
