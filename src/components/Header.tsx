import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useCartCount } from "@/hooks/useCartCount";
import { useWishlistCount } from "@/hooks/useWishlistCount";
import ProductSearch from "@/components/ProductSearch";
import AuthProfileMenu from "@/components/AuthProfileMenu";

import { categories as categoryList } from "../config/categories";

const Header = () => {
  const { user } = useAuth();
  const cartCount = useCartCount();
  const wishlistCount = useWishlistCount();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="container mx-auto py-4 px-4 flex flex-col sm:flex-row items-center justify-between gap-y-2">
        <Link to="/" className="order-1 flex items-center">
          <img src="/images/Logos/NidhiS.svg" alt="Nidhis" className="h-[130px] w-auto" />
        </Link>

        <div className="flex-1 flex justify-center w-full sm:w-auto order-2 sm:order-1">
          <div className="hidden sm:block w-full max-w-md">
            <ProductSearch />
          </div>
        </div>

        <nav className="flex flex-wrap gap-6 sm:gap-8 items-center order-3">
          {/* Categories dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="text-green font-medium hover:text-saffron transition-colors focus:outline-none">
              Categories
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-md border border-gold/20 bg-white shadow-lg p-1">
              {categoryList.map((c) => (
                <DropdownMenuItem asChild key={c.slug} className="text-green hover:bg-saffron/10 hover:text-saffron cursor-pointer">
                  <Link to={`/category/${c.slug}`}>{c.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {user ? (
            <AuthProfileMenu />
          ) : (
            <Link to="/auth" className="text-green font-medium hover:text-saffron transition-colors">Sign in</Link>
          )}
          <Link to="/blog" className="text-green font-medium hover:text-saffron transition-colors">
            Blog
          </Link>
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
