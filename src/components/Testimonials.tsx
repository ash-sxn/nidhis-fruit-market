
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import React from "react";

const testimonials = [
  {
    name: "Priya Sharma",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    review:
      "Absolutely loved the quality and taste! The almonds were crunchy and fresh. Fast delivery too.",
    rating: 5,
  },
  {
    name: "Ankit Jain",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
    review:
      "Best place for premium dry fruits. I bought saffron and pistachio – both exceeded my expectations.",
    rating: 5,
  },
  {
    name: "Ruchi Patel",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
    review:
      "Gift boxes are beautifully packed and perfect for festivals. My family loved it!",
    rating: 4,
  },
  {
    name: "Vikram Singh",
    avatar: "https://randomuser.me/api/portraits/men/68.jpg",
    review:
      "Highly recommended! The variety and the freshness are unmatched.",
    rating: 5,
  },
];

const getStars = (n: number) => (
  <span className="flex gap-0.5">
    {Array.from({ length: n }).map((_, i) => (
      <Star key={i} className="w-4 h-4 text-gold fill-gold" />
    ))}
  </span>
);

const Testimonials = () => {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-white py-20 relative z-10">
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-3xl font-playfair font-bold text-center text-saffron mb-2">
          What Our Customers Say
        </h2>
        <p className="mb-8 text-neutral-700 text-center">
          Our loyal customers love us for our quality, service, and tradition.
        </p>
        <div className="relative w-full flex justify-center items-center">
          <motion.div
            key={current}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="bg-neutral-50 rounded-xl border border-gold/10 shadow-card px-8 py-8 max-w-xl mx-auto text-center min-h-[220px] flex flex-col items-center"
          >
            <img
              src={testimonials[current].avatar}
              alt={testimonials[current].name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gold mb-3"
              loading="lazy"
            />
            <p className="text-lg text-neutral-800 font-medium mb-3">"{testimonials[current].review}"</p>
            <div className="flex items-center gap-1 mb-2">{getStars(testimonials[current].rating)}</div>
            <span className="text-saffron font-bold font-playfair">{testimonials[current].name}</span>
          </motion.div>
        </div>
        {/* Carousel dots */}
        <div className="flex justify-center gap-2 pt-5">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              className={`w-3 h-3 rounded-full ${idx === current ? "bg-saffron" : "bg-neutral-300"} transition-all`}
              onClick={() => setCurrent(idx)}
              aria-label={`View testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
