import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

// Local placeholder index that matches the items shown on the homepage
const staticProductIndex: SearchResult[] = [
  // Nidhis Dry Fruits
  {
    name: "Almond – California [500gm]",
    image: "/images/dryfruits/almonds.jpg",
    category: "Nidhis Dry Fruits",
    route: "/category/nidhis-dry-fruits",
  },
  {
    name: "Almond Gurbandi [500gm]",
    image: "/images/dryfruits/almonds-gurbandi.jpg",
    category: "Nidhis Dry Fruits",
    route: "/category/nidhis-dry-fruits",
  },
  {
    name: "Black Dates [500gm]",
    image: "/images/dryfruits/dates.jpg",
    category: "Nidhis Dry Fruits",
    route: "/category/nidhis-dry-fruits",
  },
  {
    name: "Blueberry [250gm]",
    image: "/images/dryfruits/blueberries-dried.jpg",
    category: "Super Food",
    route: "/category/super-food",
  },
  // Nidhis Spices
  {
    name: "Coriander Powder [100gm]",
    image: "/images/dryfruits/coriander-powder.jpg",
    category: "Nidhis Spices",
    route: "/category/nidhis-spices",
  },
  {
    name: "Cumin Powder [100gm]",
    image: "/images/dryfruits/cumin-powder.jpg",
    category: "Nidhis Spices",
    route: "/category/nidhis-spices",
  },
  {
    name: "Jain Sabji Masala [100gm]",
    image: "/images/dryfruits/jain-sabji-masala.jpg",
    category: "Nidhis Spices",
    route: "/category/nidhis-spices",
  },
  // Nidhis Whole Spices
  {
    name: "Black Cardamom [100gm]",
    image: "/images/dryfruits/black-cardamom.jpg",
    category: "Nidhis Whole Spices",
    route: "/category/nidhis-whole-spices",
  },
  {
    name: "Black Pepper [100gm]",
    image: "/images/dryfruits/black-pepper.jpg",
    category: "Nidhis Whole Spices",
    route: "/category/nidhis-whole-spices",
  },
  {
    name: "Green Cardamom [100gm]",
    image: "/images/dryfruits/green-cardamom.jpg",
    category: "Nidhis Whole Spices",
    route: "/category/nidhis-whole-spices",
  },
  // Super Food
  {
    name: "Chilgoza [250gm]",
    image: "/images/dryfruits/chilgoza.jpg",
    category: "Super Food",
    route: "/category/super-food",
  },
  {
    name: "Cranberry [250gm]",
    image: "/images/dryfruits/cranberries-dried.jpg",
    category: "Super Food",
    route: "/category/super-food",
  },
  {
    name: "Mixed Fruits, Seeds & Nuts [500gm]",
    image: "/images/dryfruits/mix-nuts.jpg",
    category: "Super Food",
    route: "/category/super-food",
  },
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
