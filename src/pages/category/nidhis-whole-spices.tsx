
import React from "react";
import CategoryLayout from "@/components/CategoryLayout";
import ProductSection, { Product } from "@/components/ProductSection";
import ProductSortFilterBar from "@/components/ProductSortFilterBar";

const products: Product[] = [
  { name: "Black Cardamom [100gm]", image: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=400&q=80", price: "₹225.00" },
  { name: "Black Pepper [100gm]", image: "https://images.unsplash.com/photo-1466721591366-2d5fba72006d?auto=format&fit=crop&w=400&q=80", price: "₹199.00" },
  { name: "Cumin Seeds [100gm]", image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80", price: "₹125.00" },
  { name: "Green Cardamom [100gm]", image: "https://images.unsplash.com/photo-1501286353178-1ec881214838?auto=format&fit=crop&w=400&q=80", price: "₹349.00" }
];

const [initialSort, initialFilter] = ["default", "all"];

export default function NidhisWholeSpicesPage() {
  const [sort, setSort] = React.useState(initialSort);
  const [filter, setFilter] = React.useState(initialFilter);

  let filteredProducts = [...products];
  if (filter === "under-1000") {
    filteredProducts = filteredProducts.filter(p => {
      const price = typeof p.price === "string"
        ? parseInt(p.price.replace(/[^\d]/g, ""))
        : parseInt(p.price.sale.replace(/[^\d]/g, ""));
      return price < 1000;
    });
  }
  if (filter === "1000-2000") {
    filteredProducts = filteredProducts.filter(p => {
      const price = typeof p.price === "string"
        ? parseInt(p.price.replace(/[^\d]/g, ""))
        : parseInt(p.price.sale.replace(/[^\d]/g, ""));
      return price >= 1000 && price <= 2000;
    });
  }
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
          Nidhis Whole Spices
        </h1>
        <p className="text-lg text-neutral-700 max-w-2xl text-center">
          Whole spices for every kitchen need. Showing {filteredProducts.length} results.
        </p>
      </div>
      <ProductSortFilterBar
        sortValue={sort}
        filterValue={filter}
        onSortChange={setSort}
        onFilterChange={setFilter}
      />
      <ProductSection
        title="Nidhis Whole Spices"
        products={filteredProducts}
      />
    </CategoryLayout>
  );
}

