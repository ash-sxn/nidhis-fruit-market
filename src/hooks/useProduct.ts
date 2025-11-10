import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export type ProductVariantRow = {
  id: string
  product_id?: string
  label: string
  grams: number | null
  price_cents: number
  mrp_cents: number | null
  inventory: number | null
  is_default: boolean
  is_active: boolean
}

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
  default_variant_id: string | null
  variants: ProductVariantRow[]
}

export const useProductBySlug = (slug?: string) => {
  return useQuery({
    queryKey: ['product', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) return null

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id,name,slug,category,price_cents,mrp_cents,description,inventory,image_url,updated_at,default_variant_id')
        .eq('slug', slug)
        .maybeSingle()

      if (productError) throw productError
      if (!product) return null

      const { data: variantRows, error: variantError } = await supabase
        .from('product_variants')
        .select('id,product_id,label,grams,price_cents,mrp_cents,inventory,is_default,is_active')
        .eq('product_id', product.id)
        .order('is_default', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (variantError) throw variantError

      return {
        ...(product as Omit<ProductDetailRow, 'variants'>),
        variants: variantRows ?? []
      }
    },
  })
}
