
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCartCount = () => {
  return useQuery({
    queryKey: ["cart-count"],
    queryFn: async () => {
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) {
        console.error("Error fetching cart count:", error);
        return 0;
      }
      return count || 0;
    },
    select: (data) => data ?? 0,
  }).data ?? 0;
};
