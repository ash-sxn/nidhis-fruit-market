
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useAddToWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      product_id,
    }: {
      product_id: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to add to wishlist.");
      // Insert into wishlists
      const { error } = await supabase.from("wishlists").insert({
        user_id: user.id,
        product_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
      toast({
        title: "Added to wishlist!",
        description: "This item was added to your wishlist.",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Could not add to wishlist",
        description: e?.message || "Try logging in.",
        variant: "destructive",
      });
    },
  });
}
