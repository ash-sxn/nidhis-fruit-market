
-- Create table for user's cart items
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and allow users to only access their own cart items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own cart items"
  ON public.cart_items
  FOR ALL
  USING (auth.uid() = user_id);

-- Create table for user's wishlist items
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own wishlist"
  ON public.wishlists
  FOR ALL
  USING (auth.uid() = user_id);
