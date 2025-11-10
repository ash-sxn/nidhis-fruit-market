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

type AdminProductRow = Database['public']['Tables']['products']['Row'] & {
  variants: VariantFormValues[]
}

type VariantFormValues = {
  id: string
  label: string
  grams: number | null
  price: number
  mrp: number
  inventory: number
  sku?: string | null
  is_active: boolean
  is_default: boolean
}

type FormValues = {
  id: string
  name: string
  slug: string
  category: string
  description: string
  is_active: boolean
  image_url: string | null
  image_path?: string | null
  variants: VariantFormValues[]
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
  description: z.string().max(2000).optional().default(""),
  is_active: z.boolean(),
  image_url: imageUrlSchema
})

const sanitizeNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined) return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const sanitizeCents = (value: unknown) => {
  const parsed = sanitizeNumber(value, 0)
  return Math.max(0, Math.round(parsed * 100))
}

const sanitizeInventory = (value: unknown) => {
  const parsed = sanitizeNumber(value, 0)
  return Math.max(0, Math.round(parsed))
}

const parseInputNumber = (value: string) => {
  if (!value) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseNullableNumber = (value: string) => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapRowToForm(row: AdminProductRow): FormValues {
  const variants: VariantFormValues[] = (row.variants ?? []).map((variant) => ({
    id: variant.id,
    label: variant.label,
    grams: variant.grams,
    price: variant.price_cents / 100,
    mrp: (variant.mrp_cents ?? variant.price_cents) / 100,
    inventory: variant.inventory ?? 0,
    sku: variant.sku,
    is_active: variant.is_active,
    is_default: variant.is_default
  }))

  if (variants.length === 0) {
    variants.push({
      id: crypto.randomUUID(),
      label: 'Standard Pack',
      grams: null,
      price: row.price_cents / 100,
      mrp: (row.mrp_cents ?? row.price_cents) / 100,
      inventory: row.inventory ?? 0,
      sku: null,
      is_active: true,
      is_default: true
    })
  }

  variants.sort((a, b) => {
    if (a.is_default && !b.is_default) return -1
    if (!a.is_default && b.is_default) return 1
    return a.label.localeCompare(b.label)
  })

  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? "",
    category: row.category,
    description: row.description ?? "",
    is_active: row.is_active,
    image_url: row.image_url,
    image_path: row.image_path ?? null,
    variants
  }
}

function mapFormToUpsert(values: FormValues) {
  const defaultVariant = values.variants.find((variant) => variant.is_default) ?? values.variants[0]
  const priceCents = sanitizeCents(defaultVariant?.price)
  const mrpCents = sanitizeCents(defaultVariant?.mrp ?? defaultVariant?.price)
  const inventory = sanitizeInventory(defaultVariant?.inventory)

  return {
    id: values.id,
    name: values.name,
    slug: values.slug || null,
    category: values.category,
    price_cents: priceCents,
    mrp_cents: mrpCents,
    inventory,
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

  const [initialVariantIds, setInitialVariantIds] = useState<string[]>([])

  const { data: products = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data: productRows, error } = await supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      const rows = productRows ?? []
      if (rows.length === 0) return []

      const productIds = rows.map((row) => row.id)
      const { data: variantRows, error: variantError } = await supabase
        .from('product_variants')
        .select('id,product_id,label,grams,price_cents,mrp_cents,inventory,sku,is_active,is_default')
        .in('product_id', productIds)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (variantError) throw variantError
      const grouped = new Map<string, VariantFormValues[]>()
      for (const variant of variantRows ?? []) {
        const bucket = grouped.get(variant.product_id!) ?? []
        bucket.push({
          id: variant.id,
          label: variant.label,
          grams: variant.grams,
          price: variant.price_cents / 100,
          mrp: (variant.mrp_cents ?? variant.price_cents) / 100,
          inventory: variant.inventory ?? 0,
          sku: variant.sku,
          is_active: variant.is_active,
          is_default: variant.is_default,
        })
        grouped.set(variant.product_id!, bucket)
      }

      return rows.map((row) => ({
        ...(row as Database['public']['Tables']['products']['Row']),
        variants: grouped.get(row.id)?.sort((a, b) => Number(b.is_default) - Number(a.is_default)) ?? []
      })) as AdminProductRow[]
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

      const values = { ...payload.values, image_url: imageUrl ?? null, image_path: imagePath }
      const baseUpsert = mapFormToUpsert(values)

      const { data: productRow, error: productError } = await supabase
        .from('products')
        .upsert(baseUpsert)
        .select('*')
        .single()

      if (productError) throw productError

      const defaultVariant = values.variants.find((variant) => variant.is_default) ?? values.variants[0]
      const defaultVariantId = defaultVariant?.id

      const normalizedVariants = values.variants.map((variant, index) => ({
          id: variant.id,
          product_id: values.id,
          label: variant.label,
          grams: variant.grams,
        price_cents: sanitizeCents(variant.price),
        mrp_cents: sanitizeCents(variant.mrp ?? variant.price),
        inventory: sanitizeInventory(variant.inventory),
          sku: variant.sku ?? null,
          is_active: variant.is_active,
          is_default: defaultVariantId ? variant.id === defaultVariantId : index === 0,
          sort_order: index
        }))

      if (normalizedVariants.length === 0) {
        throw new Error('Add at least one weight option before saving')
      }

      const { error: variantError } = await supabase
        .from('product_variants')
        .upsert(normalizedVariants, { onConflict: 'id' })

      if (variantError) throw variantError

      const currentIds = normalizedVariants.map((variant) => variant.id)
      const toDelete = initialVariantIds.filter((id) => !currentIds.includes(id))
      if (toDelete.length > 0) {
        await supabase.from('product_variants').delete().in('id', toDelete)
      }

      setInitialVariantIds(currentIds)

      return productRow as AdminProductRow
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
    mutationFn: async (product: AdminProductRow) => {
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
      const description = err?.code === '23503'
        ? 'This product is linked to existing orders and cannot be deleted.'
        : err?.message ?? 'Please try again'
      toast({ title: 'Delete failed', description, variant: 'destructive' })
    }
  })

  const openForEdit = (row: AdminProductRow) => {
    const form = mapRowToForm(row)
    setDraft(form)
    setFile(null)
    setInitialVariantIds(form.variants.map((variant) => variant.id))
    setDialogOpen(true)
  }

  const openForCreate = () => {
    const id = crypto.randomUUID()
    const form: FormValues = {
      id,
      name: '',
      slug: '',
      category: categoryOptions[0],
      description: '',
      is_active: true,
      image_url: null,
      image_path: null,
      variants: [
        {
          id: crypto.randomUUID(),
          label: '250 g',
          grams: 250,
          price: 0,
          mrp: 0,
          inventory: 0,
          sku: null,
          is_active: true,
          is_default: true
        }
      ]
    }
    setDraft(form)
    setFile(null)
    setInitialVariantIds([])
    setDialogOpen(true)
  }

  const statusBadge = (product: AdminProductRow) => (
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
          <Button
            variant="outline"
            className="border-slate-600 bg-slate-900/60 text-slate-100 hover:border-emerald-400 hover:text-emerald-200"
            onClick={() => refetch()}
            disabled={isFetching}
          >
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
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Weight & pricing variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-emerald-400/60 text-emerald-100 bg-emerald-500/5 hover:bg-emerald-500/15 hover:text-emerald-50"
                    onClick={() => setDraft((prev) => prev ? {
                      ...prev,
                      variants: [
                        ...prev.variants,
                        {
                          id: crypto.randomUUID(),
                          label: 'New pack',
                          grams: null,
                          price: 0,
                          mrp: 0,
                          inventory: 0,
                          sku: null,
                          is_active: true,
                          is_default: prev.variants.length === 0
                        }
                      ]
                    } : prev)}
                  >
                    Add weight option
                  </Button>
                </div>
                <div className="space-y-4">
                  {draft.variants.map((variant, index) => (
                    <div key={variant.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="default-variant"
                            checked={variant.is_default}
                            onChange={() => setDraft((prev) => prev ? {
                              ...prev,
                              variants: prev.variants.map((v) => ({ ...v, is_default: v.id === variant.id }))
                            } : prev)}
                          />
                          <span className="text-xs text-slate-400">Default</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Active</span>
                          <Switch
                            checked={variant.is_active}
                            onCheckedChange={(checked) => setDraft((prev) => prev ? {
                              ...prev,
                              variants: prev.variants.map((v) => v.id === variant.id ? { ...v, is_active: checked } : v)
                            } : prev)}
                          />
                          {draft.variants.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-rose-400 hover:text-rose-300"
                              onClick={() => setDraft((prev) => prev ? {
                                ...prev,
                                variants: prev.variants.filter((v) => v.id !== variant.id)
                              } : prev)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-5">
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs uppercase tracking-wide text-slate-500">Label</Label>
                          <Input
                            value={variant.label}
                            onChange={(e) => setDraft((prev) => prev ? {
                              ...prev,
                              variants: prev.variants.map((v) => v.id === variant.id ? { ...v, label: e.target.value } : v)
                            } : prev)}
                            className="bg-slate-800 border-slate-700 text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-slate-500">Weight (g)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.grams ?? ''}
                            placeholder="e.g. 250"
                            className="bg-slate-800 border-slate-700 text-slate-100"
                            onChange={(e) => setDraft((prev) => prev ? {
                              ...prev,
                              variants: prev.variants.map((v) => v.id === variant.id ? { ...v, grams: parseNullableNumber(e.target.value) } : v)
                            } : prev)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-slate-500">Price (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price}
                            className="bg-slate-800 border-slate-700 text-slate-100"
                            onChange={(e) => setDraft((prev) => prev ? {
                              ...prev,
                              variants: prev.variants.map((v) => v.id === variant.id ? { ...v, price: parseInputNumber(e.target.value) } : v)
                            } : prev)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-slate-500">MRP (₹)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.mrp}
                            className="bg-slate-800 border-slate-700 text-slate-100"
                            onChange={(e) => setDraft((prev) => prev ? {
                              ...prev,
                              variants: prev.variants.map((v) => v.id === variant.id ? { ...v, mrp: parseInputNumber(e.target.value) } : v)
                            } : prev)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-slate-500">Inventory</Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.inventory}
                            className="bg-slate-800 border-slate-700 text-slate-100"
                            onChange={(e) => setDraft((prev) => prev ? {
                              ...prev,
                              variants: prev.variants.map((v) => v.id === variant.id ? { ...v, inventory: parseInputNumber(e.target.value) } : v)
                            } : prev)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs uppercase tracking-wide text-slate-500">SKU (optional)</Label>
                        <Input
                          value={variant.sku ?? ''}
                          placeholder="e.g. CASHEW-250G"
                          className="bg-slate-800 border-slate-700 text-slate-100"
                          onChange={(e) => setDraft((prev) => prev ? {
                            ...prev,
                            variants: prev.variants.map((v) => v.id === variant.id ? { ...v, sku: e.target.value } : v)
                          } : prev)}
                        />
                      </div>
                      {!variant.is_active && (
                        <p className="text-xs text-rose-400">Hidden from storefront until reactivated.</p>
                      )}
                    </div>
                  ))}
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
