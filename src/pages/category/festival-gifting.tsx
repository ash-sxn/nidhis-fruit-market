import React from "react";
import CategoryLayout from "@/components/CategoryLayout";
import ProductSection, { Product } from "@/components/ProductSection";
import ProductSortFilterBar from "@/components/ProductSortFilterBar";

const products: Product[] = [
  {
    name: "FESTIVAL FUSION BITES",
    image: "https://images.unsplash.com/photo-1498936178812-4b2e558d2937?auto=format&fit=crop&w=400&q=80",
    price: "₹425.00"
  }
];

const initialSort = "default";

export default function FestivalGiftingPage() {
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
          Festival Gifting
        </h1>
        <p className="text-lg text-neutral-700 max-w-2xl text-center">
          Showing {filteredProducts.length} result{filteredProducts.length > 1 ? "s" : ""}.
        </p>
      </div>
      <ProductSortFilterBar
        sortValue={sort}
        onSortChange={setSort}
      />
      <ProductSection
        title="Festival Gifting"
        products={filteredProducts}
      />
    </CategoryLayout>
  );
}
