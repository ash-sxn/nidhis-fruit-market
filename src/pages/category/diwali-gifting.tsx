import React from "react";
import CategoryLayout from "@/components/CategoryLayout";
import ProductSection, { Product } from "@/components/ProductSection";
import ProductSortFilterBar from "@/components/ProductSortFilterBar";

const products: Product[] = [
  {
    name: "Basket of Flavors",
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80",
    price: "₹1,399.00"
  },
  {
    name: "Celebration Crunch Box",
    image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=400&q=80",
    price: "₹1,599.00"
  },
  {
    name: "Color of Flavor",
    image: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=400&q=80",
    price: "₹1,899.00"
  },
  {
    name: "Del Nidhi Diwali Pack",
    image: "https://images.unsplash.com/photo-1498936178812-4b2e558d2937?auto=format&fit=crop&w=400&q=80",
    price: "₹1,499.00"
  },
  {
    name: "Diwali Delight Boxes",
    image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=400&q=80",
    price: "Box of Four: ₹2,000.00"
  },
  {
    name: "Festival Fusion Feast",
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80",
    price: "₹1,799.00"
  },
  {
    name: "Golden Glow Box",
    image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=400&q=80",
    price: "₹1,099.00"
  },
  {
    name: "Happy Happy Pack",
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80",
    price: "₹1,299.00"
  }
];

const initialSort = "default";

export default function DiwaliGiftingPage() {
  const [sort, setSort] = React.useState(initialSort);

  let filteredProducts = [...products];
  if (sort === "price-asc") {
    filteredProducts.sort((a, b) => {
      const priceA = typeof a.price === "string"
        ? parseInt(a.price.replace(/[^\d]/g, ""))
        : parseInt(a.price.sale.replace(/[^\d]/g, ""));
      const priceB = typeof b.price === "string"
        ? parseInt(b.price.replace(/[^\d]/g, ""))
        : parseInt(b.price.sale.replace(/[^\d]/g, ""));
      return priceA - priceB;
    });
  }
  if (sort === "price-desc") {
    filteredProducts.sort((a, b) => {
      const priceA = typeof a.price === "string"
        ? parseInt(a.price.replace(/[^\d]/g, ""))
        : parseInt(a.price.sale.replace(/[^\d]/g, ""));
      const priceB = typeof b.price === "string"
        ? parseInt(b.price.replace(/[^\d]/g, ""))
        : parseInt(b.price.sale.replace(/[^\d]/g, ""));
      return priceB - priceA;
    });
  }
  if (sort === "name-asc") {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sort === "name-desc") {
    filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
  }

  return (
    <CategoryLayout>
      <div className="min-h-[20vh] flex flex-col items-center justify-center mb-6">
        <h1 className="text-3xl md:text-5xl font-bold font-playfair text-green mb-2">
          Diwali Gifting
        </h1>
        <p className="text-lg text-neutral-700 max-w-2xl text-center">
          Gift Packs for Diwali. Available for Limited Time.<br />
          Bulk Orders are available! Showing {filteredProducts.length} results.
        </p>
      </div>
      <ProductSortFilterBar
        sortValue={sort}
        onSortChange={setSort}
      />
      <ProductSection
        title="Basket of Flavors & Other Diwali Packs"
        products={filteredProducts}
      />
    </CategoryLayout>
  );
}
