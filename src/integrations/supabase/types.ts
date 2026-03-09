export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          line1: string
          line2: string | null
          city: string
          state: string
          pincode: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone: string
          line1: string
          line2?: string | null
          city: string
          state: string
          pincode: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          line1?: string
          line2?: string | null
          city?: string
          state?: string
          pincode?: string
          is_default?: boolean
          created_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          cover_image_url: string | null
          body: string
          status: string
          published_at: string | null
          author_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          cover_image_url?: string | null
          body: string
          status?: string
          published_at?: string | null
          author_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          cover_image_url?: string | null
          body?: string
          status?: string
          published_at?: string | null
          author_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          slug: string | null
          category: string
          price_cents: number
          mrp_cents: number | null
          inventory: number
          description: string | null
          updated_at: string | null
          image_url: string | null
          image_path: string | null
          search_document: unknown | null
          is_active: boolean
          created_at: string
          default_variant_id: string | null
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          category: string
          price_cents: number
          mrp_cents?: number | null
          inventory?: number
          description?: string | null
          updated_at?: string | null
          image_url?: string | null
          image_path?: string | null
          search_document?: unknown | null
          is_active?: boolean
          created_at?: string
          default_variant_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          category?: string
          price_cents?: number
          mrp_cents?: number | null
          inventory?: number
          description?: string | null
          updated_at?: string | null
          image_url?: string | null
          image_path?: string | null
          search_document?: unknown | null
          is_active?: boolean
          created_at?: string
          default_variant_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
          variant_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
          variant_id?: string
        }
        Update: {
          added_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
          variant_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          label: string
          grams: number | null
          price_cents: number
          mrp_cents: number | null
          inventory: number
          sku: string | null
          is_active: boolean
          is_default: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          label: string
          grams?: number | null
          price_cents: number
          mrp_cents?: number | null
          inventory?: number
          sku?: string | null
          is_active?: boolean
          is_default?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          label?: string
          grams?: number | null
          price_cents?: number
          mrp_cents?: number | null
          inventory?: number
          sku?: string | null
          is_active?: boolean
          is_default?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          user_id: string
          status: string
          total_cents: number
          currency: string
          address_snapshot: Json
          payment_ref: string | null
          order_number: string | null
          subtotal_cents: number | null
          discount_cents: number | null
          shipping_cents: number | null
          shipping_option: string | null
          coupon_id: string | null
          coupon_snapshot: Json | null
          email_sent_at: string | null
          payment_method: string
          created_at: string
          updated_at: string
          shipping_provider: string | null
          shipping_awb: string | null
          shipping_status: string | null
          shipping_tracking_url: string | null
          shipping_label_url: string | null
          shipping_meta: Json | null
          shipping_synced_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          total_cents: number
          currency?: string
          address_snapshot: Json
          payment_ref?: string | null
          order_number?: string | null
          subtotal_cents?: number | null
          discount_cents?: number | null
          shipping_cents?: number | null
          shipping_option?: string | null
          coupon_id?: string | null
          coupon_snapshot?: Json | null
          email_sent_at?: string | null
          payment_method?: string
          created_at?: string
          updated_at?: string
          shipping_provider?: string | null
          shipping_awb?: string | null
          shipping_status?: string | null
          shipping_tracking_url?: string | null
          shipping_label_url?: string | null
          shipping_meta?: Json | null
          shipping_synced_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          total_cents?: number
          currency?: string
          address_snapshot?: Json
          payment_ref?: string | null
          order_number?: string | null
          subtotal_cents?: number | null
          discount_cents?: number | null
          shipping_cents?: number | null
          shipping_option?: string | null
          coupon_id?: string | null
          coupon_snapshot?: Json | null
          email_sent_at?: string | null
          payment_method?: string
          created_at?: string
          updated_at?: string
          shipping_provider?: string | null
          shipping_awb?: string | null
          shipping_status?: string | null
          shipping_tracking_url?: string | null
          shipping_label_url?: string | null
          shipping_meta?: Json | null
          shipping_synced_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          name_snapshot: string
          price_cents_snapshot: number
          quantity: number
          variant_id: string
          variant_label: string | null
          variant_grams: number | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          name_snapshot: string
          price_cents_snapshot: number
          quantity?: number
          variant_id: string
          variant_label?: string | null
          variant_grams?: number | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          name_snapshot?: string
          price_cents_snapshot?: number
          quantity?: number
          variant_id?: string
          variant_label?: string | null
          variant_grams?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          added_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_with_items: {
        Args: {
          p_currency: string | null
          p_address: Json | null
          p_items: Json
          p_shipping_cents?: number | null
          p_shipping_option?: string | null
          p_coupon_code?: string | null
          p_payment_method?: string | null
        }
        Returns: Json
      }
      restock_order_inventory: {
        Args: {
          p_order_id: string
        }
        Returns: null
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
      profile_links: {
        Row: {
          id: string
          user_id: string
          label: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          url?: string
          created_at?: string
        }
        Relationships: []
      }
