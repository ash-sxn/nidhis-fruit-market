import React from "react";
import CategoryLayout from "@/components/CategoryLayout";
import ProductSection, { Product } from "@/components/ProductSection";
import ProductSortFilterBar from "@/components/ProductSortFilterBar";

const products: Product[] = [
  { name: "Almond – California [500gm]", image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80", price: "₹840.00" },
  { name: "Almond Gurbandi [500gm]", image: "https://images.unsplash.com/photo-1466721591366-2d5fba72006d?auto=format&fit=crop&w=400&q=80", price: "₹690.00" },
  { name: "Black Dates [500gm]", image: "https://images.unsplash.com/photo-1465379944081-7f47de8d74ac?auto=format&fit=crop&w=400&q=80", price: "₹499.00" },
  { name: "Blueberry [250gm]", image: "https://images.unsplash.com/photo-1485833077593-4278bba3f11f?auto=format&fit=crop&w=400&q=80", price: "₹599.00" },
  { name: "Cashew Nut – A Royal Nutty Treat [500gm]", image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=400&q=80", price: "₹899.00" },
  { name: "Chilgoza [250gm]", image: "https://images.unsplash.com/photo-1501286353178-1ec881214838?auto=format&fit=crop&w=400&q=80", price: "₹2,999.00" },
  { name: "Cranberry [250gm]", image: "https://images.unsplash.com/photo-1498936178812-4b2e558d2937?auto=format&fit=crop&w=400&q=80", price: "₹540.00" },
  { name: "FRUITS-NUT & MUESLI [300gm]", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=400&q=80", price: "₹350.00" },
  { name: "Makhana (Foxnut) [500gm]", image: "https://images.unsplash.com/photo-1469041797191-50ace28483c3?auto=format&fit=crop&w=400&q=80", price: "₹780.00" },
  { name: "Masala Cashew [500gm]", image: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=400&q=80", price: "₹899.00" },
  { name: "Masala Makhana [500gm]", image: "https://images.unsplash.com/photo-1452378174528-3090a4bba7b2?auto=format&fit=crop&w=400&q=80", price: "₹960.00" },
  { name: "Mixed Fruits, Seeds & Nuts [500gm]", image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80", price: "₹899.00" },
  { name: "Peri Peri Cashew [200gm]", image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=400&q=80", price: "₹370.00" },
  { name: "Raisins – A Juicy Treat [500gm]", image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=400&q=80", price: "₹450.00" },
  { name: "ROYAL TREAT [500gm]", image: "https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?auto=format&fit=crop&w=400&q=80", price: "₹799.00" },
  { name: "Salted Pistachios – Healthy & Superb [500gm]", image: "https://images.unsplash.com/photo-1452378174528-3090a4bba7b2?auto=format&fit=crop&w=400&q=80", price: "₹1,080.00" },
  { name: "Walnut Kernel [500gm]", image: "https://images.unsplash.com/photo-1498936178812-4b2e558d2937?auto=format&fit=crop&w=400&q=80", price: "₹849.00" }
];

const initialSort = "default";

export default function NidhisDryFruitsPage() {
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
          Nidhis Dry Fruits
        </h1>
        <p className="text-lg text-neutral-700 max-w-2xl text-center">
          Shop the best quality dry fruits from Nidhis. Showing {filteredProducts.length} results.
        </p>
      </div>
      <ProductSortFilterBar
        sortValue={sort}
        onSortChange={setSort}
      />
      <ProductSection
        title="Nidhis Dry Fruits"
        products={filteredProducts}
      />
    </CategoryLayout>
  );
}
