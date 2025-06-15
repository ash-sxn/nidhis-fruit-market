
import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Heart } from "lucide-react";

const CartButtonPanel: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="fixed right-3 bottom-4 z-50 flex flex-col gap-2 md:hidden">
      <button
        className="p-3 rounded-full bg-white shadow-lg"
        aria-label="Mobile Cart"
        onClick={() => navigate("/cart")}
      >
        <ShoppingCart className="w-6 h-6 text-saffron" />
      </button>
      <button
        className="p-3 rounded-full bg-white shadow-lg"
        aria-label="Mobile Wishlist"
        onClick={() => navigate("/wishlist")}
      >
        <Heart className="w-6 h-6 text-rose-500" />
      </button>
    </div>
  );
};
export default CartButtonPanel;
