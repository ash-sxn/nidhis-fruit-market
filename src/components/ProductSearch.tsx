import React, { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"

const categoryRouteMap: Record<string, string> = {
  "Nidhis Dry Fruits": "/category/nidhis-dry-fruits",
  "Nidhis Spices": "/category/nidhis-spices",
  "Nidhis Whole Spices": "/category/nidhis-whole-spices",
  "Super Food": "/category/super-food",
  "Bestsellers": "/category/diwali-gifting",
  "Gift Boxes": "/category/festival-gifting",
  "Combos": "/category/dry-fruits-combo",
}

type Suggestion = {
  id: string
  name: string
  category: string
  slug: string | null
  image: string
}

const ProductSearch: React.FC = () => {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Suggestion[]>([])
  const navigate = useNavigate()
  useEffect(() => {
    if (!focused || query.trim().length < 2) {
      setResults([])
      return
    }
    let active = true
    setLoading(true)
    const timer = setTimeout(async () => {
      const term = query.trim()
      let request = supabase
        .from('products')
        .select('id,name,category,image_url,slug')
        .eq('is_active', true)
        .limit(6)

      if (term.length >= 2) {
        request = request.textSearch('search_document', term, { config: 'english', type: 'websearch' })
      } else {
        request = request.ilike('name', `%${term}%`)
      }

      const { data } = await request
      if (active) {
        setResults(
          (data ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            slug: row.slug,
            image: row.image_url ?? '/placeholder.svg'
          }))
        )
        setLoading(false)
      }
    }, 220)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, focused])

  const handleNavigate = (item: any) => {
    if (item?.slug) {
      navigate(`/product/${item.slug}`)
    } else if (item?.category && categoryRouteMap[item.category as keyof typeof categoryRouteMap]) {
      navigate(categoryRouteMap[item.category as keyof typeof categoryRouteMap])
    } else {
      navigate(`/products?q=${encodeURIComponent(query.trim())}`)
    }
    setFocused(false)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    navigate(`/products?q=${encodeURIComponent(term)}`)
    setFocused(false)
  }

  return (
    <div className="relative w-full max-w-md flex-1 mx-auto">
      <form onSubmit={handleSubmit} className="flex items-center border border-green rounded-full bg-white px-4">
        <Search className="w-4 h-4 text-green mr-2" />
        <Input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-0 focus:ring-0 bg-transparent shadow-none p-0 text-base"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          aria-label="Search products"
        />
      </form>
      {focused && query.length > 0 && (
        <div className="absolute left-0 mt-2 w-full bg-white rounded-lg shadow-lg z-50 max-h-72 overflow-auto border border-green/30">
          {loading ? (
            <div className="px-4 py-3 text-neutral-400 text-sm">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="divide-y divide-neutral-100">
              {results.map((result) => (
                <li
                  key={result.id}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-green/10"
                  onMouseDown={() => handleNavigate(result)}
                >
                  <img
                    src={result.image}
                    alt={result.name}
                    className="w-8 h-8 rounded object-cover border"
                  />
                  <div>
                    <div className="font-medium text-[15px]">{result.name}</div>
                    <div className="text-xs text-neutral-500">{result.category}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-neutral-400 text-sm">No products found.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProductSearch
