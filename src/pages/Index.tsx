// Nidhis Dry Fruits homepage composed of main sections

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedCategories from "@/components/FeaturedCategories";
import Testimonials from "@/components/Testimonials";
import NewsletterSignup from "@/components/NewsletterSignup";
import Footer from "@/components/Footer";
import FrequentlyBought from "@/components/FrequentlyBought";
import ProductSection from "@/components/ProductSection";
import { dryFruits, spices, wholeSpices, superFood } from "@/config/products";
import FadeInOnScroll from "@/components/FadeInOnScroll";
import CartButtonPanel from "@/components/CartButtonPanel";

// product data now comes from src/config/products

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background font-inter">
      <Header />
      {/* Cart & Wishlist quick access for mobile */}
      <CartButtonPanel />
      <main className="flex-1 w-full max-w-[1500px] mx-auto">
        <FadeInOnScroll delay={0}>
          <HeroSection />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.08}>
          <FeaturedCategories />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.13}>
          <FrequentlyBought />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.15}>
          <ProductSection
            title="Nidhis Dry Fruits"
            products={dryFruits}
            viewAllLink="#"
          />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.18}>
          <ProductSection
            title="Nidhis Spices"
            products={spices}
            viewAllLink="#"
          />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.21}>
          <ProductSection
            title="Nidhis Whole Spices"
            products={wholeSpices}
            viewAllLink="#"
          />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.24}>
          <ProductSection
            title="Super Food"
            products={superFood}
            viewAllLink="#"
          />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.27}>
          <Testimonials />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.28}>
          <NewsletterSignup />
        </FadeInOnScroll>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
