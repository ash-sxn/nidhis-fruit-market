
import React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import type { Database } from "@/integrations/supabase/types"
import { Loader2 } from "lucide-react"

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"]

const fetchBlogPosts = async (): Promise<BlogPost[]> => {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id,title,slug,excerpt,cover_image_url,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nulls: "last" })

  if (error) throw error
  return data ?? []
}

const BlogPostCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <article className="bg-white shadow-sm rounded-xl border mb-8 overflow-hidden transition hover:shadow-lg">
    <Link to={`/blog/${post.slug}`} className="block">
      <img
        src={post.cover_image_url || "/placeholder.svg"}
        onError={(e) => {
          e.currentTarget.src = "/placeholder.svg"
        }}
        alt={post.title}
        className="w-full h-56 object-cover"
      />
    </Link>
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <Link to={`/blog/${post.slug}`} className="block">
          <h2 className="text-2xl font-semibold font-playfair text-saffron hover:text-saffron/80 transition">
            {post.title}
          </h2>
        </Link>
        <p className="text-sm text-neutral-500">
          {post.published_at
            ? new Date(post.published_at).toLocaleDateString("en-IN", { dateStyle: "long" })
            : "Draft"}
        </p>
      </div>
      <p className="text-neutral-700">{post.excerpt ?? "Tap to read more."}</p>
      <div>
        <Link to={`/blog/${post.slug}`} className="text-saffron font-semibold text-sm hover:underline">
          Read more →
        </Link>
      </div>
    </div>
  </article>
)

const BlogPage: React.FC = () => {
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: fetchBlogPosts
  })

  return (
    <main className="container max-w-4xl py-12 min-h-screen">
      <div className="text-center mb-10 space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-saffron">Nidhis Stories</p>
        <h1 className="text-4xl font-bold font-playfair text-neutral-900">Our Blog</h1>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          Field notes, ingredient spotlights, and gifting inspiration from the world of mindful snacks.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-neutral-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading stories…
        </div>
      ) : error ? (
        <div className="text-center text-rose-500 py-20">{(error as Error).message}</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-neutral-500 py-20">No stories published yet. Check back soon!</div>
      ) : (
        posts.map((post) => <BlogPostCard key={post.id} post={post} />)
      )}
    </main>
  )
}

export default BlogPage
