import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  image_url: string | null;
};

export const useProducts = (category?: string) => {
  return useQuery({
    queryKey: ["products", category ?? "all"],
    queryFn: async () => {
      let q = supabase.from("products").select("id,name,category,price_cents,image_url").eq("is_active", true);
      if (category) q = q.eq("category", category);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data as ProductRow[]) ?? [];
    },
  });
};

