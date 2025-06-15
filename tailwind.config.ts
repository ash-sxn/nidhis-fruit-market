
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        inter: ['Inter', 'sans-serif'],
        // accent: ["'Great Vibes'", 'cursive'],
      },
      colors: {
        saffron: { DEFAULT: "#FF6B35" },
        gold: { DEFAULT: "#FFD700" },
        green: { DEFAULT: "#2D5016" },
        background: "#FAFAFA",
        neutral: {
          50: "#F9F6F1",
          100: "#EEEEEA",
          200: "#E6E2DD",
          300: "#D5CFC2",
          400: "#B5AB8C",
          500: "#A39371",
          600: "#7C6B50",
          700: "#5E533B"
        }
      },
      boxShadow: {
        card: "0 2px 8px 0 rgba(70,50,30,0.08)",
      },
      borderRadius: {
        xl: "1.25rem"
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
