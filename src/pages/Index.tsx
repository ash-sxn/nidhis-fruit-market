import Header from "@/components/Header"
import HeroSection from "@/components/HeroSection"
import FeaturedCategories from "@/components/FeaturedCategories"
import Testimonials from "@/components/Testimonials"
import NewsletterSignup from "@/components/NewsletterSignup"
import Footer from "@/components/Footer"
import FrequentlyBought from "@/components/FrequentlyBought"
import ProductSection, { type ProductSectionItem } from "@/components/ProductSection"
import FadeInOnScroll from "@/components/FadeInOnScroll"
import CartButtonPanel from "@/components/CartButtonPanel"
import { useProducts } from "@/hooks/useProducts"

const categorySlugMap: Record<string, string> = {
  "Nidhis Dry Fruits": "nidhis-dry-fruits",
  "Nidhis Spices": "nidhis-spices",
  "Nidhis Whole Spices": "nidhis-whole-spices",
  "Super Food": "super-food",
}

const homeSections: Array<{ title: string; category: string; delay: number }> = [
  { title: "Nidhis Dry Fruits", category: "Nidhis Dry Fruits", delay: 0.15 },
  { title: "Nidhis Spices", category: "Nidhis Spices", delay: 0.18 },
  { title: "Nidhis Whole Spices", category: "Nidhis Whole Spices", delay: 0.21 },
  { title: "Super Food", category: "Super Food", delay: 0.24 },
]

type CategorisedProduct = ProductSectionItem & { category: string }

const groupProductsByCategory = (items: CategorisedProduct[], category: string) =>
  items.filter((item) => item.category === category)

const Index = () => {
  const { data: rows = [], isLoading, error } = useProducts()

  const allProducts: CategorisedProduct[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    image: row.image_url ?? "/placeholder.svg",
    priceCents: row.price_cents,
    category: row.category,
    slug: row.slug ?? undefined,
    originalPriceCents: row.mrp_cents ?? undefined,
    description: row.description ?? '',
    inventory: row.inventory ?? null,
    variantId: row.default_variant_id ?? null,
    variantLabel: null,
  }))

  return (
    <div className="flex flex-col min-h-screen bg-background font-inter">
      <Header />
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
        {homeSections.map(({ title, category, delay }) => {
          const products = groupProductsByCategory(allProducts, category)
          const slug = categorySlugMap[category]

          if (error) {
            return (
              <FadeInOnScroll key={category} delay={delay}>
                <div className="py-12 text-center text-red-500">Could not load {title}.</div>
              </FadeInOnScroll>
            )
          }

          if (isLoading) {
            return (
              <FadeInOnScroll key={category} delay={delay}>
                <div className="py-12 text-center text-neutral-500">Loading {title}...</div>
              </FadeInOnScroll>
            )
          }

          if (products.length === 0) {
            return (
              <FadeInOnScroll key={category} delay={delay}>
                <div className="py-12 text-center text-neutral-500">
                  No products available in {title} yet.
                </div>
              </FadeInOnScroll>
            )
          }

          return (
            <FadeInOnScroll key={category} delay={delay}>
              <ProductSection
                title={title}
                products={products}
                viewAllLink={slug ? `/category/${slug}` : undefined}
              />
            </FadeInOnScroll>
          )
        })}
        <FadeInOnScroll delay={0.27}>
          <Testimonials />
        </FadeInOnScroll>
        <FadeInOnScroll delay={0.28}>
          <NewsletterSignup />
        </FadeInOnScroll>
      </main>
      <Footer />
    </div>
  )
}

export default Index
