// Nidhis Dry Fruits homepage composed of main sections

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedCategories from "@/components/FeaturedCategories";
import Testimonials from "@/components/Testimonials";
import NewsletterSignup from "@/components/NewsletterSignup";
import Footer from "@/components/Footer";
import FrequentlyBought from "@/components/FrequentlyBought";
import ProductSection from "@/components/ProductSection";

const dryFruits = [
  {
    name: "Almond – California [500gm]",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
    price: "₹840.00",
  },
  {
    name: "Almond Gurbandi [500gm]",
    image: "https://images.unsplash.com/photo-1450370364277-5ae5ce37c6b0?auto=format&fit=crop&w=400&q=80",
    price: "₹690.00",
  },
  {
    name: "Black Dates [500gm]",
    image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=400&q=80",
    price: "₹499.00",
  },
  {
    name: "Blueberry [250gm]",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    price: "₹599.00",
  },
];

const spices = [
  {
    name: "Coriander Powder [100gm]",
    image: "https://images.unsplash.com/photo-1524594154909-6ff45b1b5c92?auto=format&fit=crop&w=400&q=80",
    price: "₹99.00",
  },
  {
    name: "Cumin Powder [100gm]",
    image: "https://images.unsplash.com/photo-1502741347565-179b3b6b4882?auto=format&fit=crop&w=400&q=80",
    price: "₹99.00",
  },
  {
    name: "Jain Sabji Masala [100gm]",
    image: "https://images.unsplash.com/photo-1500315331616-db9a6c62b69e?auto=format&fit=crop&w=400&q=80",
    price: "₹139.00",
  },
  {
    name: "Mukhwas [100gm]",
    image: "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80",
    price: "₹109.00",
  },
];

const wholeSpices = [
  {
    name: "Black Cardamom [100gm]",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
    price: "₹225.00",
  },
  {
    name: "Black Pepper [100gm]",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    price: "₹199.00",
  },
  {
    name: "Cumin Seeds [100gm]",
    image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=400&q=80",
    price: "₹125.00",
  },
  {
    name: "Green Cardamom [100gm]",
    image: "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80",
    price: { original: "₹399.00", sale: "₹349.00" },
  },
];

const superFood = [
  {
    name: "Blueberry [250gm]",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    price: "₹599.00",
  },
  {
    name: "Chilgoza [250gm]",
    image: "https://images.unsplash.com/photo-1500315331616-db9a6c62b69e?auto=format&fit=crop&w=400&q=80",
    price: { original: "₹3,299.00", sale: "₹2,999.00" },
  },
  {
    name: "Cranberry [250gm]",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    price: "₹540.00",
  },
  {
    name: "Mixed Fruits, Seeds & Nuts [500gm]",
    image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=400&q=80",
    price: "₹899.00",
  },
];

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background font-inter">
      <Header />
      <main className="flex-1 w-full max-w-[1500px] mx-auto">
        <HeroSection />
        <FeaturedCategories />

        <FrequentlyBought />

        <ProductSection
          title="Nidhis Dry Fruits"
          products={dryFruits}
          viewAllLink="#"
        />
        <ProductSection
          title="Nidhis Spices"
          products={spices}
          viewAllLink="#"
        />
        <ProductSection
          title="Nidhis Whole Spices"
          products={wholeSpices}
          viewAllLink="#"
        />
        <ProductSection
          title="Super Food"
          products={superFood}
          viewAllLink="#"
        />

        <Testimonials />
        <NewsletterSignup />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
