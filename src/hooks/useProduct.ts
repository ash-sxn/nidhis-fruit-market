import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export type ProductDetailRow = {
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
}

export const useProductBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ['product', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) return null

      const { data, error } = await supabase
        .from('products')
        .select('id,name,slug,category,price_cents,mrp_cents,description,inventory,image_url,updated_at')
        .eq('slug', slug)
        .maybeSingle()

      if (error) throw error
      return (data as ProductDetailRow | null) ?? null
    },
  })
}
