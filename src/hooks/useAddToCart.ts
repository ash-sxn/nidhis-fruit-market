
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type AddToCartArgs = {
  product_id: string;
  variant_id?: string | null;
  quantity?: number;
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product_id, variant_id, quantity }: AddToCartArgs) => {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to add to cart.");

      const { data: productRow, error: productError } = await supabase
        .from('products')
        .select('id, name, is_active, default_variant_id')
        .eq('id', product_id)
        .maybeSingle();

      if (productError) throw productError;
      if (!productRow || productRow.is_active !== true) throw new Error('Product unavailable');

      let targetVariantId = variant_id ?? productRow.default_variant_id;
      if (!targetVariantId) {
        const { data: fallbackVariant, error: fallbackError } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', product_id)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (fallbackError) throw fallbackError
        targetVariantId = fallbackVariant?.id ?? null
      }
      if (!targetVariantId) throw new Error('Please select a weight option');

      const { data: variantRow, error: variantError } = await supabase
        .from('product_variants')
        .select('id, label, inventory, is_active')
        .eq('id', targetVariantId)
        .maybeSingle();

      if (variantError) throw variantError;
      if (!variantRow || variantRow.is_active !== true) throw new Error('This weight is unavailable');

      const available = variantRow.inventory ?? 0;
      if (available <= 0) throw new Error('Out of stock');

      const { data: existing, error: existingError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product_id)
        .eq('variant_id', variantRow.id)
        .maybeSingle();

      if (existingError) throw existingError;

      const nextQuantity = (existing?.quantity ?? 0) + (quantity ?? 1);
      if (nextQuantity > available) {
        throw new Error(`Only ${available} left in stock`);
      }

      const { error } = await supabase
        .from('cart_items')
        .upsert(
          {
            user_id: user.id,
            product_id,
            variant_id: variantRow.id,
            quantity: nextQuantity,
          },
          { onConflict: 'user_id,product_id,variant_id' }
        );

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
