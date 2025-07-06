
import { Gift, Leaf, Star, TrendingUp, CircleDollarSign, Apple } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  {
    name: "Dry Fruits",
    icon: Apple,
    desc: "Almonds, Cashews, Raisins & more",
  },
  {
    name: "Spices",
    icon: Leaf,
    desc: "Saffron, Cardamom, Cloves",
  },
  {
    name: "Gift Boxes",
    icon: Gift,
    desc: "Festive & corporate combos",
  },
  {
    name: "Combos",
    icon: CircleDollarSign,
    desc: "Value packs, curated sets",
  },
  {
    name: "Superfoods",
    icon: Star,
    desc: "Seeds, berries, health boosters",
  },
  {
    name: "Bestsellers",
    icon: TrendingUp,
    desc: "Top-rated favorites",
  },
];

// map category display names to route slugs
const slugMap: Record<string, string> = {
  "Dry Fruits": "nidhis-dry-fruits",
  "Spices": "nidhis-spices",
  "Gift Boxes": "festival-gifting",
  "Combos": "dry-fruits-combo",
  "Superfoods": "super-food",
  "Bestsellers": "diwali-gifting",
};

const FeaturedCategories = () => {
  return (
    <section id="categories" className="py-16 bg-neutral-50">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-playfair font-bold text-center text-green mb-3">
          Featured Categories
        </h2>
        <p className="text-neutral-700 text-center max-w-2xl mx-auto mb-8">
          Explore our handpicked categories and discover quality products for every need.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map(({ name, icon: Icon, desc }) => {
            const slug = slugMap[name] ?? "#";
            return (
              <Link
                key={name}
                to={slug.startsWith("#") ? slug : `/category/${slug}`}
                className="rounded-xl bg-white shadow-card hover:shadow-lg transition-shadow hover:-translate-y-1 p-7 flex flex-col items-center text-center border border-gold/10 group"
              >
                <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-saffron/10 mb-4 group-hover:bg-saffron/20 transition-colors">
                  <Icon className="w-8 h-8 text-saffron" />
                </span>
                <h3 className="text-xl font-bold text-saffron font-playfair mb-1">{name}</h3>
                <p className="text-neutral-600">{desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
