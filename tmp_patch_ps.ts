
import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import all products statically. In a real app, this would be fetched.
import { default as IndexPage } from "@/pages/Index";

// Helper type for Product
type Product = {
  name: string;
  image: string;
  price: string | { original: string; sale: string };
};

type SearchResult = {
  name: string;
  category: string;
  image: string;
  route: string;
};

const staticProductIndex: SearchResult[] = [
  // Nidhis Dry Fruits
  {
    name: "Almond – California [500gm]",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Dry Fruits",
    route: "/category/nidhis-dry-fruits",
  },
  {
    name: "Almond Gurbandi [500gm]",
    image: "https://images.unsplash.com/photo-1450370364277-5ae5ce37c6b0?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Dry Fruits",
    route: "/category/nidhis-dry-fruits",
  },
  {
    name: "Black Dates [500gm]",
    image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Dry Fruits",
    route: "/category/nidhis-dry-fruits",
  },
  {
    name: "Blueberry [250gm]",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    category: "Super Food",
    route: "/category/super-food",
  },
  // Nidhis Spices
  {
    name: "Coriander Powder [100gm]",
    image: "https://images.unsplash.com/photo-1524594154909-6ff45b1b5c92?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Spices",
    route: "/category/nidhis-spices",
  },
  {
    name: "Cumin Powder [100gm]",
    image: "https://images.unsplash.com/photo-1502741347565-179b3b6b4882?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Spices",
    route: "/category/nidhis-spices",
  },
  {
    name: "Jain Sabji Masala [100gm]",
    image: "https://images.unsplash.com/photo-1500315331616-db9a6c62b69e?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Spices",
    route: "/category/nidhis-spices",
  },
  // Nidhis Whole Spices
  {
    name: "Black Cardamom [100gm]",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Whole Spices",
    route: "/category/nidhis-whole-spices",
  },
  {
    name: "Black Pepper [100gm]",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Whole Spices",
    route: "/category/nidhis-whole-spices",
  },
  {
    name: "Green Cardamom [100gm]",
    image: "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80",
    category: "Nidhis Whole Spices",
    route: "/category/nidhis-whole-spices",
  },
  // Super Food
  {
    name: "Chilgoza [250gm]",
    image: "https://images.unsplash.com/photo-1500315331616-db9a6c62b69e?auto=format&fit=crop&w=400&q=80",
    category: "Super Food",
    route: "/category/super-food",
  },
  {
    name: "Cranberry [250gm]",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    category: "Super Food",
    route: "/category/super-food",
  },
  {
    name: "Mixed Fruits, Seeds & Nuts [500gm]",
    image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=400&q=80",
    category: "Super Food",
    route: "/category/super-food",
  },
  // Add more as needed from your sections
];

const ProductSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return staticProductIndex.filter((p) =>
      p.name.toLowerCase().includes(query.trim().toLowerCase())
    );
  }, [query]);

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
          {results.length > 0 ? (
            <ul className="divide-y divide-neutral-100">
              {results.map((result) => (
                <li
                  key={result.name}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-green/10"
                  onMouseDown={() => {
                    navigate(result.route);
                    setQuery("");
                  }}
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
            <div className="px-4 py-3 text-neutral-400 text-sm">
              No products found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;


