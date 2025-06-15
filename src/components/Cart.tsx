
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";

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

const Cart: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cart-items"],
    queryFn: fetchCartItems,
  });

  const mutation = useMutation({
    mutationFn: removeCartItem,
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
        <div className="text-neutral-500">Your cart is empty.</div>
      ) : (
        <ul className="space-y-6">
          {data.map((item: any) => (
            <li key={item.id} className="flex items-center justify-between border rounded-md p-4">
              <div>
                <div className="font-semibold">Product: {item.product_id}</div>
                <div className="text-sm">Quantity: {item.quantity}</div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => mutation.mutate(item.id)}
              >Remove</Button>
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
