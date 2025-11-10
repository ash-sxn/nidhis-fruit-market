import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductRow = {
  id: string
  name: string
  slug: string | null
  category: string
  price_cents: number
  mrp_cents: number | null
  description: string | null
  inventory: number
  image_url: string | null
  updated_at: string
  default_variant_id: string | null
}

type UseProductsOptions = {
  enabled?: boolean;
};

export const useProducts = (category?: string, options?: UseProductsOptions) => {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["products", category ?? "all"],
    enabled,
    queryFn: async () => {
      if (!enabled) return [] as ProductRow[];

      let query = supabase
        .from("products")
        .select("id,name,slug,category,price_cents,mrp_cents,description,inventory,image_url,updated_at,default_variant_id")
        .eq("is_active", true);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data as ProductRow[]) ?? [];
    },
  });
};
