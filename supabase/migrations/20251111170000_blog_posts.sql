create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  cover_image_url text,
  body text not null,
  status text not null default 'draft',
  published_at timestamptz,
  author_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_idx on public.blog_posts (status, published_at desc nulls last);

create or replace function public.blog_posts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at before update on public.blog_posts
for each row execute procedure public.blog_posts_set_updated_at();

alter table public.blog_posts enable row level security;

create policy "Anyone can read published blog posts"
  on public.blog_posts
  for select
  using (
    status = 'published'
  );

create policy "Admins can manage blog posts"
  on public.blog_posts
  for all
  using (
    public.is_admin(auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
  );

insert into public.blog_posts (title, slug, excerpt, cover_image_url, body, status, published_at)
values
  (
    'Nutty Goodness',
    'nutty-goodness',
    'Farm fresh almonds packed with omega-3, antioxidants, and crunchy flavor.',
    '/images/dryfruits/nutty-goodness.png',
    '100 percent farm fresh, handpicked whole Almond kernel.

Rich Nourishment: Almonds carry a lot of nutritional elements. These are rich sources of Omega-3, anti-oxidants, vitamins, calcium, iron, and magnesium.

Health Positive: Almonds are fiber-rich but low on carbohydrates, it makes them an exceptional choice for those who want to tag along a healthy diet to sustain a healthy lifestyle. Being high on antioxidants, they protect the body against free radical damage.

Power Snack: Almonds make it to the top of the snacking segment. Being raw and crunchy, almonds are most loved power snacks.

Pure and natural: We carry our motto in our heart while crafting the best of the products. “Perfect blend of purity and flavor with no Gluten, no GMO, and no preservatives.',
    'published',
    now()
  ),
  (
    'A Royal Nutty Treat',
    'royal-nutty-treat',
    'Handpicked cashews that deliver royal nutrition, energy, and indulgent snacking.',
    '/images/dryfruits/cashew-nut-royal-nutty-treat.jpg',
    'Handpicked farm fresh whole Cashew kernels.

Wholesome Nutrition: Cashew nuts are a royal treat. With protein 21.2 %, carbohydrates 22 %, fat 47 %, amino acid and minerals, which are not regularly found in the daily meal, makes them immensely valuable.

Energy Powerhouse: Cashew kernel are rich in proteins, carbohydrates, vitamins, and fats. They are an enormous source of energy.

Sumptuous Snacking: Cashew nuts make it up for the perfect snacks, anytime as they are loaded with proteins, fibers, vitamins and antioxidants.

Pure and natural: We just not offer products; we care for your wellbeing too. Our products are perfect blend of purity and flavour.',
    'published',
    now()
  ),
  (
    'Happy and Wholesome',
    'happy-and-wholesome',
    'A colorful mix of nuts, dried fruits, and seeds for protein-packed snacking.',
    '/images/dryfruits/mixed-fruits-seeds-nuts.png',
    'Protein Punch and Fiber Rich: Each of the ingredient is packed with surplus amount of protein and dietary fiber making this mix must have for every health enthusiast especially the vegan ones. With every mouthful, you will receive a bunch of nutrients.

Dried kiwis, dried pineapples, sunflower seeds, pumpkin seeds, watermelon seeds, musk melon seeds, black raisins, cranberries, flaxseeds, almonds, cashew nuts, melon seeds mixed vigorously to create Mixed seeds and nuts Jar.

Power Packed Snacking: Enriched with Omega 3, 6 and other essential fatty acids, the handful is enough to fill-in the body with burst of energy. It is a perfect pick for anytime munching. Snack it up with zero guilt.

Nourish & Replenish: Get ready to nourish yourself deep within. Handpicked from the best of quality crops, the mix is a colourful assortment of nuts, dried fruits and seeds providing best nourishment and offers fullness of the taste.

Pure and natural: We swear by our tagline, “Perfect blend of purity and flavour”. Free from all synthetic preservatives and additives, only the natural methods are used to increase the shelf life. Full on health benefits and no nasties here. You are all in for health reasons buddy!',
    'published',
    now()
  )
on conflict (slug) do nothing;
