import React, { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import type { Database } from "@/integrations/supabase/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, PlusCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"]

const fetchPosts = async (): Promise<BlogPost[]> => {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

const emptyForm: Omit<BlogPost, "id" | "created_at" | "updated_at" | "author_id"> & { id?: string } = {
  id: undefined,
  title: "",
  slug: "",
  excerpt: "",
  cover_image_url: "",
  body: "",
  status: "draft",
  published_at: null
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

const AdminBlogPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ["blog-posts-admin"],
    queryFn: fetchPosts
  })

  const [form, setForm] = useState(emptyForm)

  const handleTitleChange = (value: string) => {
    setForm((prev) => {
      const normalizedCurrent = slugify(prev.title || "")
      const shouldUpdateSlug = !prev.id && (!prev.slug || prev.slug === normalizedCurrent)
      return {
        ...prev,
        title: value,
        slug: shouldUpdateSlug ? slugify(value) : prev.slug
      }
    })
  }

  const upsertPost = useMutation({
    mutationFn: async (overrides?: { status?: "draft" | "published" }) => {
      if (!form.title.trim()) throw new Error("Title is required")
      if (!form.body.trim()) throw new Error("Body cannot be empty")

      const { data: session } = await supabase.auth.getSession()
      const authorId = session.session?.user?.id ?? null

      const payload = {
        title: form.title.trim(),
        slug: (form.slug || slugify(form.title)).trim(),
        excerpt: form.excerpt?.trim() || null,
        cover_image_url: form.cover_image_url?.trim() || null,
        body: form.body.trim(),
        status: overrides?.status ?? form.status ?? "draft",
        published_at:
          overrides?.status === "published"
            ? form.published_at ?? new Date().toISOString()
            : overrides?.status === "draft"
              ? null
              : form.published_at,
        author_id: authorId
      }

      if (form.id) {
        const { data, error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", form.id)
          .select("*")
          .maybeSingle()
        if (error) throw error
        return data as BlogPost
      }

      const { data, error } = await supabase.from("blog_posts").insert(payload).select("*").maybeSingle()
      if (error) throw error
      return data as BlogPost
    },
    onSuccess: (post) => {
      toast({ title: "Blog post saved" })
      setForm({
        ...post,
        excerpt: post.excerpt ?? "",
        cover_image_url: post.cover_image_url ?? ""
      })
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] })
    },
    onError: (err: any) => {
      toast({ title: "Unable to save post", description: err.message ?? "Try again", variant: "destructive" })
    }
  })

  const handleSelect = (post?: BlogPost) => {
    if (!post) {
      setForm(emptyForm)
      return
    }
    setForm({
      ...post,
      excerpt: post.excerpt ?? "",
      cover_image_url: post.cover_image_url ?? ""
    })
  }

  const handlePublish = (status: "draft" | "published") => {
    upsertPost.mutate({ status })
  }

  const postsByStatus = useMemo(() => posts, [posts])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Blog</h2>
          <p className="text-sm text-slate-400">Create stories and manage published articles.</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-200" onClick={() => handleSelect()}>
          <PlusCircle className="w-4 h-4 mr-2" />
          New post
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="px-4 py-3 border-b border-slate-800 text-sm uppercase tracking-wide text-slate-500">
            Published stories
          </div>
          <div className="divide-y divide-slate-800">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading posts…
              </div>
            ) : error ? (
              <div className="py-6 px-4 text-rose-300 text-sm">{(error as Error).message}</div>
            ) : postsByStatus.length === 0 ? (
              <div className="py-6 px-4 text-slate-500 text-sm">No posts yet.</div>
            ) : (
              postsByStatus.map((post) => (
                <button
                  key={post.id}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition ${
                    form.id === post.id ? "bg-slate-800 text-white" : "text-slate-200"
                  }`}
                  onClick={() => handleSelect(post)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{post.title}</p>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        post.status === "published" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-700 text-slate-200"
                      }`}
                    >
                      {post.status}
                    </Badge>
                  </div>
                  {post.published_at && (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(post.published_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">{form.id ? "Edit story" : "Create story"}</p>
              <h3 className="text-lg font-semibold text-white">{form.title || "Untitled story"}</h3>
            </div>
            {form.status && (
              <Badge
                className={`text-xs ${
                  form.status === "published" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-700 text-slate-200"
                }`}
              >
                {form.status}
              </Badge>
            )}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">Title</label>
              <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Enter headline" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                placeholder="nutty-goodness"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">Cover image URL</label>
              <Input
                value={form.cover_image_url ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, cover_image_url: e.target.value }))}
                placeholder="/images/dryfruits/nutty-goodness.png"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">Excerpt</label>
              <Textarea
                rows={3}
                value={form.excerpt ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Short teaser that appears on the listing page."
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-slate-300">Body</label>
              <Textarea
                rows={12}
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Write the full story. Use blank lines to separate paragraphs."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => upsertPost.mutate()} disabled={upsertPost.isPending}>
              {upsertPost.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save draft
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePublish("published")}
              disabled={upsertPost.isPending}
              className="text-emerald-300 border-emerald-500/30"
            >
              Publish
            </Button>
            {form.status === "published" && (
              <Button
                variant="outline"
                onClick={() => handlePublish("draft")}
                disabled={upsertPost.isPending}
                className="text-amber-300 border-amber-500/30"
              >
                Move to draft
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminBlogPage
