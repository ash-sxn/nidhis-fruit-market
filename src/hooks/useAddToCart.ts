
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

      const { data: productRow, error: productError } = await supabase
        .from('products')
        .select('id, name, inventory, is_active')
        .eq('id', product_id)
        .maybeSingle()

      if (productError) throw productError
      if (!productRow || productRow.is_active !== true) throw new Error('Product unavailable')
      if ((productRow.inventory ?? 0) <= 0) throw new Error('Out of stock')

      const { data: existing, error: existingError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product_id)
        .maybeSingle()

      if (existingError) throw existingError

      const nextQuantity = (existing?.quantity ?? 0) + (quantity ?? 1)
      if (nextQuantity > (productRow.inventory ?? 0)) {
        throw new Error(`Only ${productRow.inventory} left in stock`)
      }

      const { error } = await supabase
        .from('cart_items')
        .upsert({ user_id: user.id, product_id, quantity: nextQuantity }, { onConflict: 'user_id,product_id' })

      if (error) throw error
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
