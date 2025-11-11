import React from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Loader2, ArrowLeft } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import type { Database } from "@/integrations/supabase/types"

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"]

const fetchBlogPost = async (slug: string): Promise<BlogPost | null> => {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw error
  if (!data || data.status !== "published") return null
  return data
}

const splitBody = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

const BlogDetailPage: React.FC = () => {
  const { slug } = useParams()
  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    enabled: !!slug,
    queryFn: () => fetchBlogPost(slug || "")
  })

  const paragraphs = post ? splitBody(post.body) : []
  const shareUrl = typeof window !== "undefined" ? window.location.href : ""

  const handleCopyLink = () => {
    if (!shareUrl || typeof navigator === "undefined" || !navigator.clipboard) {
      alert("Share link unavailable")
      return
    }
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => alert("Link copied to clipboard"))
      .catch(() => alert("Could not copy link"))
  }

  return (
    <main className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-saffron mb-6 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to all stories
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading story…
          </div>
        ) : error ? (
          <div className="text-center text-rose-500 py-20">{(error as Error).message}</div>
        ) : !post ? (
          <div className="text-center text-neutral-500 py-20">We couldn’t find that story.</div>
        ) : (
          <>
            <header className="space-y-3 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-saffron">Nidhis Journal</p>
              <h1 className="text-4xl font-bold font-playfair text-neutral-900">{post.title}</h1>
              <p className="text-neutral-500">
                {post.published_at
                  ? new Date(post.published_at).toLocaleDateString("en-IN", { dateStyle: "long" })
                  : "Unpublished draft"}
              </p>
            </header>

            <div className="rounded-3xl overflow-hidden shadow">
              <img
                src={post.cover_image_url || "/placeholder.svg"}
                alt={post.title}
                className="w-full h-80 object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg"
                }}
              />
            </div>

            <article className="bg-white rounded-3xl shadow-sm border p-6 md:p-10 space-y-5 text-neutral-700 leading-relaxed">
              {paragraphs.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </article>

            <div className="border rounded-2xl p-6 text-sm text-neutral-500 bg-white shadow">
              <p className="font-semibold text-neutral-800">Share this story</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <a
                  className="text-saffron hover:underline"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  X / Twitter
                </a>
                <a
                  className="text-saffron hover:underline"
                  href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${shareUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
                <button
                  className="text-saffron hover:underline"
                  onClick={handleCopyLink}
                >
                  Copy link
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default BlogDetailPage
