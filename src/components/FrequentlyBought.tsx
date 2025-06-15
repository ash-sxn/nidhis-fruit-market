
import React from "react";
import { Button } from "@/components/ui/button";

const products = [
  {
    name: "Basket of Flavors",
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=320&q=80",
    price: "₹1,399.00",
  },
  {
    name: "Celebration Crunch Box",
    image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?auto=format&fit=crop&w=320&q=80",
    price: "₹1,599.00",
  },
  {
    name: "Color of Flavor",
    image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=320&q=80",
    price: "₹1,899.00",
  },
  {
    name: "California Almond & Cashew Combo",
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=320&q=80",
    price: "₹999.00",
  },
  {
    name: "Cashew & Raisin Combo (VKI)",
    image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=320&q=80",
    price: "₹849.00",
  },
  {
    name: "Festival Fusion Bites",
    image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?auto=format&fit=crop&w=320&q=80",
    price: "₹425.00",
  },
];

const FrequentlyBought = () => (
  <section className="py-16 bg-white" id="frequently-bought">
    <div className="container mx-auto max-w-6xl">
      <h2 className="text-3xl font-playfair font-bold text-center text-saffron mb-3">
        Frequently Bought Products
      </h2>
      <p className="text-neutral-700 text-center max-w-2xl mx-auto mb-8">
        Popular picks and festive favorites, trusted and loved by our customers.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {products.map((p) => (
          <div
            key={p.name}
            className="rounded-xl bg-neutral-50 shadow-card hover:shadow-lg transition-shadow hover:-translate-y-1 p-4 flex flex-col items-center border border-gold/10 group"
          >
            <div className="overflow-hidden rounded-lg mb-3 w-40 h-40 bg-neutral-200 flex items-center justify-center">
              <img src={p.image} alt={p.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col flex-1 items-center justify-between w-full">
              <h3 className="text-lg font-bold font-playfair text-green mb-1 text-center">{p.name}</h3>
              <p className="text-saffron font-semibold text-base mb-2">{p.price}</p>
              <Button className="bg-green text-white hover:bg-green/80 mt-auto px-6">Add to cart</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FrequentlyBought;
