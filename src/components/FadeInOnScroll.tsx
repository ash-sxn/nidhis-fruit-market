
import { motion, useAnimation } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { useRef, useEffect } from "react";

type FadeInOnScrollProps = ComponentProps<typeof motion.div> & {
  children: ReactNode;
  delay?: number;
};

/**
 * Animates children with a fade+slide-in effect when scrolled into view.
 * Use for top-level sections or cards for subtle, smooth UX.
 */
const FadeInOnScroll: React.FC<FadeInOnScrollProps> = ({
  children,
  delay = 0.1,
  ...props
}) => {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !controls) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          controls.start("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 36 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, delay },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default FadeInOnScroll;

