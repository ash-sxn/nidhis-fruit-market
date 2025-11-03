
import { motion } from "framer-motion";
import ImageWithFallback from "@/components/ImageWithFallback";

// Update to your preferred landing image. Ensure the file exists.
const heroImage = "/images/dryfruits/landing-welcome-image.png";

const HeroSection = () => {
  return (
    <section className="relative w-full min-h-[480px] flex flex-col items-center justify-center px-6 md:py-12 pt-8 pb-20 overflow-hidden">
      {/* BG Shape */}
      <div className="absolute left-0 top-0 w-full h-full bg-gradient-to-br from-saffron/10 via-gold/10 to-white pointer-events-none -z-10" />
      {/* Left Decorative */}
      <div className="absolute bottom-10 left-0 w-40 h-40 bg-saffron/10 rounded-full blur-3xl -z-10" />
      {/* Content */}
      <div className="max-w-5xl w-full flex flex-col md:flex-row gap-10 items-center">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.7, type: "spring" }}
          className="flex-1 space-y-5"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-bold text-saffron leading-tight drop-shadow">
            Taste The <span className="text-green">Tradition</span>
          </h1>
          <p className="mt-3 text-lg text-neutral-700 max-w-lg">
            Discover premium Indian dry fruits and authentic spices, handpicked for quality and freshness. Healthy, delicious, delivered to your door.
          </p>
          <div className="flex gap-3 mt-6">
            <a
              href="#categories"
              className="px-6 py-3 rounded-full bg-saffron text-white font-bold shadow hover:bg-gold transition-colors text-lg"
            >
              Shop Now
            </a>
            <a
              href="#about"
              className="px-6 py-3 rounded-full border-2 border-gold text-gold font-bold bg-white hover:bg-gold hover:text-white transition-colors text-lg"
            >
              Why Nidhis?
            </a>
          </div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7, type: "spring" }}
          className="flex-1 flex justify-center items-center"
        >
          <ImageWithFallback
            src={heroImage}
            alt="Premium Dry Fruits Platter"
            className="rounded-xl shadow-xl w-[340px] md:w-[440px] object-cover border border-gold bg-white"
            loading="eager"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
