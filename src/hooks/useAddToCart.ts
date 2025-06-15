
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      product_id,
      quantity,
    }: {
      product_id: string;
      quantity?: number;
    }) => {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to add to cart.");

      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        product_id,
        quantity: quantity ?? 1,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate cart list
      queryClient.invalidateQueries({ queryKey: ["cart-items"] });
      toast({
        title: "Added to cart!",
        description: "This item was added to your cart.",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Could not add to cart",
        description: e?.message || "Try logging in.",
        variant: "destructive",
      });
    },
  });
}
