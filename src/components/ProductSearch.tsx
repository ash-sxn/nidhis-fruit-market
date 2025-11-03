import React, { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useProducts } from "@/hooks/useProducts"

const categoryRouteMap: Record<string, string> = {
  "Nidhis Dry Fruits": "/category/nidhis-dry-fruits",
  "Nidhis Spices": "/category/nidhis-spices",
  "Nidhis Whole Spices": "/category/nidhis-whole-spices",
  "Super Food": "/category/super-food",
  "Bestsellers": "/category/diwali-gifting",
  "Gift Boxes": "/category/festival-gifting",
  "Combos": "/category/dry-fruits-combo",
}

type SearchResult = {
  id: string
  name: string
  category: string
  image: string
  route: string
}

const ProductSearch: React.FC = () => {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()
  const { data: rows = [], isLoading } = useProducts()

  const searchIndex = useMemo<SearchResult[]>(() => {
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      image: row.image_url ?? "/placeholder.svg",
      route: categoryRouteMap[row.category] ?? "#",
    }))
  }, [rows])

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []
    return searchIndex.filter((product) => product.name.toLowerCase().includes(trimmed))
  }, [query, searchIndex])

  const handleNavigate = (result: SearchResult) => {
    if (result.route === "#") return
    navigate(result.route)
    setQuery("")
  }

  return (
    <div className="relative w-full max-w-md flex-1 mx-auto">
      <div className="flex items-center border border-green rounded-full bg-white px-4">
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
      </div>
      {focused && query.length > 0 && (
        <div className="absolute left-0 mt-2 w-full bg-white rounded-lg shadow-lg z-50 max-h-72 overflow-auto border border-green/30">
          {isLoading ? (
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
