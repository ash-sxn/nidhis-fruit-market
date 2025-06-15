import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";
import { useCartCount } from "@/hooks/useCartCount";
import { useWishlistCount } from "@/hooks/useWishlistCount";
import ProductSearch from "@/components/ProductSearch";

const Header = () => {
  const cartCount = useCartCount();
  const wishlistCount = useWishlistCount();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto py-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-y-2">
        <Link to="/" className="font-playfair font-black text-2xl text-green order-1">
          Nidhis
        </Link>

        <div className="flex-1 flex justify-center w-full sm:w-auto order-2 sm:order-1">
          <div className="hidden sm:block w-full max-w-md">
            <ProductSearch />
          </div>
        </div>

        <nav className="flex gap-4 sm:gap-6 items-center order-3">
          <Link to="/wishlist" className="relative">
            <Heart className="w-6 h-6 text-rose-500" />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs rounded-full px-2 font-medium">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative">
            <ShoppingCart className="w-6 h-6 text-saffron" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-saffron text-white text-xs rounded-full px-2 font-medium">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
      <div className="block sm:hidden px-4 pb-2">
        <ProductSearch />
      </div>
    </header>
  );
};
export default Header;
