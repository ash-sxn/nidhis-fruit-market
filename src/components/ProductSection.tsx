
import React from "react";
import { Button } from "@/components/ui/button";

export type Product = {
  name: string;
  image: string;
  price: string | { original: string; sale: string };
};

interface ProductSectionProps {
  title: string;
  products: Product[];
  viewAllLink?: string;
}

const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  products,
  viewAllLink,
}) => (
  <section className="py-12 bg-white">
    <div className="container mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-playfair font-bold text-green">{title}</h2>
        {viewAllLink && (
          <a
            href={viewAllLink}
            className="px-4 py-2 rounded-full bg-green text-white font-bold text-sm shadow hover:bg-green/80 transition-colors"
          >
            View All Products
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {products.map((p) => (
          <div
            key={p.name}
            className="rounded-xl bg-neutral-50 shadow-card hover:shadow-lg transition-shadow hover:-translate-y-1 p-4 flex flex-col items-center border border-gold/10 group"
          >
            <div className="overflow-hidden rounded-lg mb-3 w-40 h-40 bg-neutral-200 flex items-center justify-center">
              <img
                src={p.image}
                alt={p.name}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
            <h3 className="text-base font-bold font-playfair text-green mb-1 text-center">{p.name}</h3>
            <div className="mb-2 text-center">
              {typeof p.price === "string" ? (
                <span className="text-green font-semibold text-base">{p.price}</span>
              ) : (
                <>
                  <span className="text-green font-semibold text-base">{p.price.sale}</span>{" "}
                  <span className="text-neutral-400 line-through text-sm ml-1">{p.price.original}</span>
                  <span className="ml-1 bg-green/10 text-xs px-2 py-0.5 rounded text-green font-medium">Sale!</span>
                </>
              )}
            </div>
            <Button className="bg-green text-white hover:bg-green/80 px-6 mt-auto">Add to cart</Button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ProductSection;
