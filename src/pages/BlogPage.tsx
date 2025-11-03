
import React from "react";

// Images (using placeholders as suggested)
const BLOG_POSTS = [
  {
    id: 1,
    title: "NUTTY GOODNESS",
    image: "/images/dryfruits/nutty-goodness.png",
    content: [
      "100 percent farm fresh, handpicked whole Almond kernel",
      "Rich Nourishment: Almonds carry a lot of nutritional elements. These are rich sources of Omega-3, anti-oxidants, vitamins, calcium, iron, and magnesium.",
      "Health Positive: Almonds are fiber-rich but low on carbohydrates, it makes them an exceptional choice for those who want to tag along a healthy diet to sustain a healthy lifestyle. Being high on antioxidants, they protect the body against free radical damage.",
      "Power Snack: Almonds make it to the top of the snacking segment. Being raw and crunchy, almonds are most loved power snacks.",
      "Pure and natural: We carry our motto in our heart while crafting the best of the products. “Perfect blend of purity and flavor with no Gluten, no GMO, and no preservatives.",
    ],
    date: "September 23, 2023",
    prev: null,
    next: 2,
  },
  {
    id: 2,
    title: "A ROYAL NUTTY TREAT",
    image: "/images/dryfruits/royal-nutty-treat.png",
    content: [
      "Handpicked Farm Fresh whole Cashew Kernels. Wholesome Nutrition- Known as rich man’s food.",
      "Wholesome Nutrition: Cashew nuts are a royal treat. With protein 21.2 %, carbohydrates 22 %, fat 47 %, amino acid and minerals, which are not regularly found in the daily meal, makes them immensely valuable.",
      "Energy Powerhouse: Cashew kernel are rich in proteins, carbohydrates, vitamins, and fats. They are an enormous source of energy.",
      "Sumptuous Snacking: Cashew nuts make it up for the perfect snacks, anytime as they are loaded with proteins, fibers, vitamins and antioxidants.",
      "Pure and natural: We just not offer products; we care for your wellbeing too. Our products are perfect blend of purity and flavour.",
    ],
    date: "September 23, 2023",
    prev: 1,
    next: 3,
  },
  {
    id: 3,
    title: "HAPPY AND WHOLESOME",
    image: "/images/dryfruits/happy-and-wholesome.png",
    content: [
      "Protein Punch and Fiber Rich: Each of the ingredient is packed with surplus amount of protein and dietary fiber making this mix must have for every health enthusiast especially the vegan ones. With every mouthful, you will receive a bunch of nutrients.",
      "Dried kiwis, dried pineapples, sunflower seeds, pumpkin seeds, watermelon seeds, musk melon seeds, black raisins, cranberries, flaxseeds, almonds, cashew nuts, melon seeds mixed vigorously to create Mixed seeds and nuts Jar.",
      "Power Packed Snacking: Enriched with Omega 3, 6 and other essential fatty acids, the handful is enough to fill-in the body with burst of energy. It is a perfect pick for anytime munching. Snack it up with zero guilt.",
      "Nourish & Replenish: Get ready to nourish yourself deep within. Handpicked from the best of quality crops, the mix is a colourful assortment of nuts, dried fruits and seeds providing best nourishment and offers fullness of the taste.",
      "Pure and natural: We swear by our tagline, “Perfect blend of purity and flavour”. Free from all synthetic preservatives and additives, only the natural methods are used to increase the shelf life. Full on health benefits and no nasties here. You are all in for health reasons buddy!",
    ],
    date: "September 23, 2023",
    prev: 2,
    next: null,
  },
];

function getPostById(id: number) {
  return BLOG_POSTS.find((p) => p.id === id);
}

const BlogPostCard: React.FC<{ post: typeof BLOG_POSTS[0] }> = ({ post }) => (
  <article className="bg-white shadow-sm rounded-xl border mb-8 overflow-hidden">
    {/* Fallback to placeholder if local image not present yet */}
    <img
      src={post.image}
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
      alt={post.title}
      className="w-full h-56 object-cover"
      style={{ objectPosition: "center" }}
    />
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-3 font-playfair text-saffron">{post.title}</h2>
      <div className="space-y-2 text-neutral-700">
        {post.content.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <div className="text-right mt-6 text-sm text-neutral-400">Published {post.date}</div>
    </div>
  </article>
);

const BlogPage: React.FC = () => {
  // For navigation, you could add state to show individual posts, for now just a list
  return (
    <main className="container max-w-2xl py-8 min-h-screen">
      <h1 className="text-3xl mb-8 font-bold text-center font-playfair text-saffron">Our Blog</h1>
      {BLOG_POSTS.map((post) => (
        <BlogPostCard key={post.id} post={post} />
      ))}
    </main>
  );
};

export default BlogPage;
