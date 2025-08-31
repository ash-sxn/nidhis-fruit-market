import React from "react";
import { useProducts } from "@/hooks/useProducts";
import ProductSection from "@/components/ProductSection";
import CategoryLayout from "@/components/CategoryLayout";

interface CategoryPageTemplateProps {
  title: string;
}

const CategoryPageTemplate: React.FC<CategoryPageTemplateProps> = ({ title }) => {
  const { data: rows = [], isLoading, error } = useProducts(title);
  const formatInr = (cents: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(cents / 100);

  return (
    <CategoryLayout>
      <div className="min-h-[20vh] flex flex-col items-center justify-center mb-6">
        <h1 className="text-3xl md:text-5xl font-bold font-playfair text-green mb-2">{title}</h1>
        <p className="text-lg text-neutral-700">Shop the best quality {title.toLowerCase()} from Nidhis.</p>
      </div>
      {isLoading ? (
        <div className="text-center text-neutral-500 py-10">Loading products…</div>
      ) : error ? (
        <div className="text-center text-red-500 py-10">Could not load products</div>
      ) : rows.length > 0 ? (
        <ProductSection
          title={title}
          products={rows.map((r) => ({ name: r.name, image: r.image_url ?? "/placeholder.svg", price: formatInr(r.price_cents) }))}
        />
      ) : (
        <div className="text-center text-neutral-500 py-10">No products yet. Add some in Supabase.</div>
      )}
    </CategoryLayout>
  );
};

export default CategoryPageTemplate;

