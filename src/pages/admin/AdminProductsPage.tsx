import React, { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import type { Database } from "@/integrations/supabase/types"
import { formatInrFromCents } from "@/lib/utils"
import { uploadProductImage } from "@/lib/storage"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Loader2, RefreshCcw, Trash2 } from "lucide-react"
import { z } from "zod"

const categoryOptions = [
  "Nidhis Dry Fruits",
  "Nidhis Spices",
  "Nidhis Whole Spices",
  "Super Food",
  "Bestsellers",
  "Gift Boxes",
  "Combos"
]

type ProductRow = Database['public']['Tables']['products']['Row']

type FormValues = {
  id: string
  name: string
  slug: string
  category: string
  price: number
  mrp: number
  inventory: number
  description: string
  is_active: boolean
  image_url: string | null
  image_path?: string | null
}

const relativePathRegex = /^\/[A-Za-z0-9_./-]+$/

const imageUrlSchema = z.union([
  z.string().url(),
  z.string().regex(relativePathRegex, 'Must be a relative path starting with "/"')
]).nullable()

const productSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  inventory: z.number().int().min(0),
  description: z.string().max(2000).optional().default(""),
  is_active: z.boolean(),
  image_url: imageUrlSchema
})

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapRowToForm(row: ProductRow): FormValues {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? "",
    category: row.category,
    price: row.price_cents / 100,
    mrp: (row.mrp_cents ?? row.price_cents) / 100,
    inventory: row.inventory ?? 0,
    description: row.description ?? "",
    is_active: row.is_active,
    image_url: row.image_url,
    image_path: row.image_path ?? null
  }
}

function mapFormToUpsert(values: FormValues) {
  return {
    id: values.id,
    name: values.name,
    slug: values.slug || null,
    category: values.category,
    price_cents: Math.round(values.price * 100),
    mrp_cents: Math.round(values.mrp * 100),
    inventory: values.inventory,
    description: values.description || null,
    is_active: values.is_active,
    image_url: values.image_url,
    image_path: values.image_path ?? null
  }
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<FormValues | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const { data: products = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as ProductRow[]
    }
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: { values: FormValues; file: File | null }) => {
      let imageUrl = payload.values.image_url
      let imagePath = payload.values.image_path ?? null

      if (payload.file) {
        const upload = await uploadProductImage(payload.file, payload.values.id)
        imageUrl = upload.publicUrl
        imagePath = upload.path
      }

      const { data, error } = await supabase
        .from('products')
        .upsert({
          ...mapFormToUpsert({ ...payload.values, image_url: imageUrl ?? null, image_path: imagePath })
        })
        .select('*')
        .single()

      if (error) throw error
      return data as ProductRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast({ title: 'Product saved', description: 'Changes synced successfully.' })
      setDialogOpen(false)
      setDraft(null)
      setFile(null)
    },
    onError: (error: any) => {
      console.error(error)
      toast({ title: 'Failed to save product', description: error.message ?? 'Please try again later', variant: 'destructive' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (product: ProductRow) => {
      const confirm = window.confirm(`Delete ${product.name}? This action cannot be undone.`)
      if (!confirm) return
      if (product.image_path) {
        await supabase.storage.from('product-images').remove([product.image_path]).catch((err) => {
          console.warn('Failed to remove image from storage', err)
        })
      }
      const { error } = await supabase.from('products').delete().eq('id', product.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Product deleted' })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    },
    onError: (err: any) => {
      toast({ title: 'Delete failed', description: err?.message ?? 'Please try again', variant: 'destructive' })
    }
  })

  const openForEdit = (row: ProductRow) => {
    const form = mapRowToForm(row)
    setDraft(form)
    setFile(null)
    setDialogOpen(true)
  }

  const openForCreate = () => {
    const id = crypto.randomUUID()
    const form: FormValues = {
      id,
      name: '',
      slug: '',
      category: categoryOptions[0],
      price: 0,
      mrp: 0,
      inventory: 0,
      description: '',
      is_active: true,
      image_url: null,
      image_path: null
    }
    setDraft(form)
    setFile(null)
    setDialogOpen(true)
  }

  const statusBadge = (product: ProductRow) => (
    product.is_active
      ? <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">Active</Badge>
      : <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">Hidden</Badge>
  )

  const rows = useMemo(() => products, [products])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Products</h2>
          <p className="text-sm text-slate-400">Create, edit, and publish catalogue entries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}Reload
          </Button>
          <Button onClick={openForCreate} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950">
            <Plus className="mr-2 h-4 w-4" /> Add product
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/60 shadow-inner">
        <table className="hidden min-w-full text-sm text-left text-slate-200 md:table">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Inventory</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={6}>Loading products…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>No products yet.</td>
              </tr>
            ) : (
              rows.map((product) => (
                <tr key={product.id} className="border-t border-slate-800/60 hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.image_url ?? '/placeholder.svg'} alt={product.name} className="h-10 w-10 rounded object-cover border border-slate-800" />
                      <div>
                        <div className="font-medium text-slate-100">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.slug ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{product.category}</td>
                  <td className="px-4 py-3">{formatInrFromCents(product.price_cents)}</td>
                  <td className="px-4 py-3">{product.inventory ?? 0}</td>
                  <td className="px-4 py-3">{statusBadge(product)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="text-slate-200 hover:text-emerald-300" onClick={() => openForEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-400 hover:text-rose-300"
                        onClick={() => deleteMutation.mutate(product)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="md:hidden divide-y divide-slate-800">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-slate-400">Loading products…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-500">No products yet.</div>
          ) : (
            rows.map((product) => (
              <div key={product.id} className="flex items-start justify-between gap-4 px-4 py-4">
                <div className="flex gap-3">
                  <img src={product.image_url ?? '/placeholder.svg'} alt={product.name} className="h-12 w-12 rounded object-cover border border-slate-800" />
                  <div className="space-y-1">
                    <p className="font-medium text-slate-100">{product.name}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{product.category}</p>
                    <p className="text-sm text-emerald-300">{formatInrFromCents(product.price_cents)}</p>
                    <p className="text-xs text-slate-500">Inventory: {product.inventory ?? 0}</p>
                    {statusBadge(product)}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" size="icon" className="text-slate-200 hover:text-emerald-300" onClick={() => openForEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-rose-400 hover:text-rose-300"
                    onClick={() => deleteMutation.mutate(product)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) {
          setDraft(null)
          setFile(null)
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-slate-700 bg-slate-900/95 text-slate-100">
          <DialogHeader>
            <DialogTitle>{draft?.id && products.some((p) => p.id === draft.id) ? 'Edit product' : 'Create product'}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form
              onSubmit={async (event) => {
                event.preventDefault()
                const candidate = {
                  ...draft,
                  slug: draft.slug || toSlug(draft.name),
                  image_url: draft.image_url && draft.image_url.length > 0 ? draft.image_url : null
                }
                const parsed = productSchema.safeParse(candidate)

                if (!parsed.success) {
                  toast({
                    title: 'Invalid inputs',
                    description: parsed.error.errors.map((e) => e.message).join(', '),
                    variant: 'destructive'
                  })
                  return
                }

                await upsertMutation.mutateAsync({ values: { ...draft, ...parsed.data }, file })
              }}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                 <Input
                    id="name"
                    className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    value={draft.slug}
                    placeholder="auto-generate"
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, slug: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, category: e.target.value } : prev)}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="bg-slate-800 border-slate-700 text-slate-100"
                    value={draft.price}
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, price: Number(e.target.value) } : prev)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mrp">MRP (₹)</Label>
                  <Input
                    id="mrp"
                    type="number"
                    step="0.01"
                    min="0"
                    className="bg-slate-800 border-slate-700 text-slate-100"
                    value={draft.mrp}
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, mrp: Number(e.target.value) } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inventory">Inventory</Label>
                  <Input
                    id="inventory"
                    type="number"
                    step="1"
                    min="0"
                    className="bg-slate-800 border-slate-700 text-slate-100"
                    value={draft.inventory}
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, inventory: Number(e.target.value) } : prev)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="bg-slate-800 border-slate-700 text-slate-100"
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Image</Label>
                <input
                  id="file"
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-slate-300"
                  onChange={(event) => {
                    const newFile = event.target.files?.[0] ?? null
                    setFile(newFile)
                  }}
                />
                {(file || draft.image_url) && (
                  <img
                    src={file ? URL.createObjectURL(file) : draft.image_url ?? undefined}
                    alt={draft.name}
                    className="mt-2 h-32 w-32 rounded-lg border border-slate-800 object-cover"
                  />
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <div>
                  <p className="text-sm font-medium">Publish</p>
                  <p className="text-xs text-slate-500">Toggle visibility in the storefront.</p>
                </div>
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(checked) => setDraft((prev) => prev ? { ...prev, is_active: checked } : prev)}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); setDraft(null); setFile(null) }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950">
                  {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
