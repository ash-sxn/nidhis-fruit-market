import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import mime from 'mime-types'

const envCandidates = ['.env.local', '.env.development.local', '.env']
for (const candidate of envCandidates) {
  const resolved = path.resolve(candidate)
  if (existsSync(resolved)) {
    config({ path: resolved, override: false })
  }
}

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const bucket = 'product-images'
const publicDir = path.resolve('public')

async function migrate() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url, image_path')

  if (error) {
    console.error('Failed to load products', error)
    process.exit(1)
  }

  let migrated = 0
  for (const product of products ?? []) {
    if (!product.image_url || product.image_url.startsWith('http')) {
      continue
    }

    const relative = product.image_url.startsWith('/') ? product.image_url.slice(1) : product.image_url
    const localPath = path.join(publicDir, relative)

    if (!existsSync(localPath)) {
      console.warn(`Skipping ${product.name}: file not found at ${localPath}`)
      continue
    }

    const fileBuffer = await readFile(localPath)
    const ext = path.extname(localPath)
    const storagePath = `${product.id}/${path.basename(localPath)}`
    const contentType = mime.lookup(ext) || 'application/octet-stream'

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, { upsert: true, contentType })

    if (uploadError) {
      console.error(`Failed to upload ${product.name}`, uploadError)
      continue
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    const publicUrl = publicUrlData?.publicUrl

    if (!publicUrl) {
      console.error(`Could not resolve public URL for ${product.name}`)
      continue
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: publicUrl, image_path: storagePath })
      .eq('id', product.id)

    if (updateError) {
      console.error(`Failed to update product ${product.name}`, updateError)
      continue
    }

    migrated += 1
    console.log(`Migrated ${product.name} -> ${publicUrl}`)
  }

  console.log(`Migration complete. Updated ${migrated} products.`)
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
