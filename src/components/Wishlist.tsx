
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";

const fetchWishlistItems = async () => {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) return [];
  const { data } = await supabase
    .from("wishlists")
    .select("id, product_id, added_at")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  return data || [];
};

const removeWishlistItem = async (id: string) => {
  await supabase.from("wishlists").delete().eq("id", id);
};

const Wishlist: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["wishlist-items"],
    queryFn: fetchWishlistItems,
  });

  const mutation = useMutation({
    mutationFn: removeWishlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
    },
  });

  if (isLoading) return <div>Loading wishlist…</div>;
  if (error) return <div>Error loading wishlist.</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 font-playfair text-saffron">Your Wishlist</h1>
      {(!data || data.length === 0) ? (
        <div className="text-neutral-500">Your wishlist is empty.</div>
      ) : (
        <ul className="space-y-6">
          {data.map((item: any) => (
            <li key={item.id} className="flex items-center justify-between border rounded-md p-4">
              <div>
                <div className="font-semibold">Product: {item.product_id}</div>
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
    </div>
  );
};

export default Wishlist;
