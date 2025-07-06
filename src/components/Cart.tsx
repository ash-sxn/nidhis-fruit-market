
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Plus, Minus, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

const fetchCartItems = async () => {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) return [];
  const { data } = await supabase
    .from("cart_items")
    .select("id, product_id, quantity, added_at")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  return data || [];
};

const removeCartItem = async (id: string) => {
  await supabase.from("cart_items").delete().eq("id", id);
};

const updateCartItemQty = async ({ id, qty }: { id: string; qty: number }) => {
  await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
};

const Cart: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cart-items"],
    queryFn: fetchCartItems,
  });

  const removeMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-items"] });
    },
  });

  const qtyMutation = useMutation({
    mutationFn: updateCartItemQty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-items"] });
    },
  });

  if (isLoading) return <div>Loading cart…</div>;
  if (error) return <div>Error loading cart.</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 font-playfair text-saffron">Your Cart</h1>
      {(!data || data.length === 0) ? (
        <div className="text-center text-neutral-500 flex flex-col items-center gap-4">
          <ShoppingBag className="w-16 h-16 text-saffron/60" />
          <p>Your cart is empty.</p>
          <Button asChild>
            <Link to="/">Browse products</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-6">
          {data.map((item: any) => (
            <li key={item.id} className="flex items-center justify-between border rounded-md p-4">
              <div>
                <div className="font-semibold">Product: {item.product_id}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => {
                  if (item.quantity > 1) qtyMutation.mutate({ id: item.id, qty: item.quantity - 1 });
                  else removeMutation.mutate(item.id);
                }}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span>{item.quantity}</span>
                <Button size="icon" variant="ghost" onClick={() => qtyMutation.mutate({ id: item.id, qty: item.quantity + 1 })}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => removeMutation.mutate(item.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8">
        <Button disabled>Checkout (coming soon)</Button>
      </div>
    </div>
  );
};

export default Cart;
