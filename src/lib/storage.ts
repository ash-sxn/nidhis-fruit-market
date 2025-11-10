import { supabase } from "@/integrations/supabase/client"

const PRODUCT_BUCKET = "product-images"

export async function uploadProductImage(file: File, productId: string) {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  const path = `${productId}/${fileName}`

  const { error } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true
  })

  if (error) throw error

  const { data: publicUrl } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path)
  return { path, publicUrl: publicUrl.publicUrl }
}

export async function deleteProductImage(path: string) {
  if (!path) return
  await supabase.storage.from(PRODUCT_BUCKET).remove([path])
}
