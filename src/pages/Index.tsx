
// Nidhis Dry Fruits homepage composed of main sections

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedCategories from "@/components/FeaturedCategories";
import Testimonials from "@/components/Testimonials";
import NewsletterSignup from "@/components/NewsletterSignup";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background font-inter">
      <Header />
      <main className="flex-1 w-full max-w-[1500px] mx-auto">
        <HeroSection />
        <FeaturedCategories />
        <Testimonials />
        <NewsletterSignup />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
