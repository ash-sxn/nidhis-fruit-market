# Nidhis Dry Fruit Market — Product Requirements (PRD)

Living document tracking everything needed to ship a reliable, secure, and performant e‑commerce site that meets industry standards. Use checkboxes to track progress.

## Vision & Goals
- Offer a premium dry fruits and spices shopping experience with fast browsing, trustworthy checkout, and clear policies.
- Centralise product data in Supabase (single source of truth) with robust security and admin tools.
- Optimise for SEO, Core Web Vitals, and accessibility.

## Non‑Goals (for now)
- Complex product configurators and subscriptions.
- Marketplace/multi‑vendor features.
- International tax calculation and advanced logistics.

## Status Snapshot
- [x] Vite + React + TS app scaffolded
- [x] Supabase project and client wiring
- [x] Auth screen and profiles table
- [x] Cart & wishlist tables with basic UI
- [x] Category routes and featured categories
- [x] Blog page scaffold
- [ ] Products fully managed in Supabase and displayed everywhere
- [ ] Checkout + payments + orders
- [ ] Admin dashboard

---

## Must‑Haves (MVP)

### 1) Product Catalog (Supabase source of truth)
- [ ] Products schema finalised with indexes and RLS
- [ ] Migrate and seed all products (names, slugs, categories, price_cents, image_url)
- [ ] Replace local static arrays with Supabase fetch across all pages
- [ ] Product detail pages by slug with SEO metadata and JSON‑LD
- [ ] Currency formatting via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`
- [x] Product variants (weight-based pricing) available across storefront, checkout, and admin tooling

Acceptance:
- [ ] Visiting any category shows products from Supabase with correct images and prices
- [ ] Visiting `/product/:slug` shows a detail page and shareable URL

### 2) Images & Media
- [ ] Normalise asset filenames (kebab‑case, no spaces, consistent extensions)
- [ ] Fix path mismatch: replace `/image/...` with `/images/...` across codebase
- [ ] Replace Unsplash placeholders with local or Storage images
- [ ] Optional: move product images to Supabase Storage bucket `product-images` and use public URLs
- [ ] Add basic image optimisation (responsive sizes, `loading="lazy"`, dimensions)

Acceptance:
- [ ] No 404s in Network tab for product/hero images
- [ ] Lighthouse image audit has no major failures

### 3) Cart & Wishlist (robust)
- [x] Add to cart/wishlist mutations
- [x] Quantity update and remove in cart
- [ ] Reference real `products.id` (FK) and render names/images from DB
- [ ] Prevent duplicates (unique composite on user_id + product_id)
- [ ] Empty‑state UX and toasts polished

Acceptance:
- [ ] Cart persists per‑user and survives reload
- [ ] Wishlist persists and deduplicates items

### 4) Checkout & Payments
- [ ] Address form and validation (name, phone, address lines, city, state, pincode)
- [ ] Shipping options (flat rate for MVP)
- [ ] Coupon support (percentage/flat, expiry, usage caps)
- [ ] Payment gateway integration (Razorpay or Stripe) with webhook verification
- [ ] Orders and order_items tables with state machine (pending, paid, fulfilled, cancelled)
- [ ] Order confirmation email and order history page

Acceptance:
- [ ] Successful payment creates an order, marks as paid after webhook, and emails the customer
- [ ] Orders list under Account shows past orders and details

### 5) Administration
- [ ] Secure roles: only service role or admin can assign roles
- [ ] Admin UI to manage products (CRUD), inventory, prices, and visibility
- [ ] Admin orders view with status updates and basic notes
- [x] Admin UI supports weight variants (add/edit/delete, default selection, per-variant inventory)

Acceptance:
- [ ] Non‑admins cannot write to products or roles via RLS
- [ ] Admin panel protects routes and reflects DB changes immediately

### 6) Search & Discovery
- [ ] Site‑wide search backed by Supabase (ILIKE) or Algolia (preferred for scale)
- [ ] Autosuggest on header search
- [ ] Sorting and filtering (price, category)

### 7) SEO & Content
- [ ] Unique meta tags per page; OpenGraph/Twitter cards
- [ ] JSON‑LD for products and breadcrumbs
- [ ] XML sitemap and robots.txt updated
- [ ] Blog powered by CMS (Sanity/Strapi) or MDX for MVP

### 8) Performance & A11y
- [ ] Target 90+ on Lighthouse (Mobile) for key pages
- [ ] Core Web Vitals within recommended thresholds
- [ ] A11y: semantic HTML, labels, focus states, keyboard nav

---

## Data Model (Proposed)

Tables (public):
- products: id (uuid), name, slug (unique), category (text or FK), description, price_cents (int), mrp_cents (int, null), image_url (text), is_active (bool), created_at, updated_at
- categories: id (uuid), slug (unique), name (text)
- cart_items: id, user_id (uuid FK auth.users), product_id (uuid FK products), quantity (int), added_at
- wishlists: id, user_id (uuid FK auth.users), product_id (uuid FK products), added_at
- orders: id, user_id, total_cents, currency, status, address_snapshot (jsonb), payment_ref, created_at
- order_items: id, order_id, product_id, name_snapshot, price_cents_snapshot, quantity
- coupons: id, code (unique), type (percent|flat), value, starts_at, ends_at, max_uses, used_count
- addresses: id, user_id, name, phone, line1, line2, city, state, pincode, is_default

Indexes & Constraints:
- [ ] Index on products(category, is_active)
- [ ] Unique (user_id, product_id) on cart_items and wishlists
- [ ] FKs: cart_items.product_id -> products.id; wishlists.product_id -> products.id

Row‑Level Security:
- [ ] Products readable when `is_active = true`
- [ ] Cart/Wishlist rows readable/writeable by `auth.uid() = user_id`
- [ ] Roles assignment restricted to admin or service role

---

## Supabase Work
- [ ] Promote `supabase/sql/products.sql` to a migration (include policies, indexes, seeds)
- [ ] Regenerate typed client to include `products` table
- [ ] Create Storage bucket `product-images` (public) or serve from `/public/images`
- [ ] Webhook handlers (Vercel/Bun/Node) for payment provider

---

## Frontend Work
- [ ] Replace static config products with Supabase queries everywhere
- [ ] Route `/product/:slug` and detail page with add‑to‑cart
- [ ] Fix `useAuth` initial state (don’t set Promise)
- [ ] Currency formatter util and consistent display
- [ ] Image components set explicit width/height to avoid CLS
- [ ] Category pages use shared template + server data

---

## Security & Compliance
- [ ] Remove policy allowing users to insert into `user_roles` arbitrarily
- [ ] Verify payment signatures/webhooks; store raw payloads
- [ ] CSP headers, Referrer Policy, X‑Frame‑Options, HSTS
- [ ] Secret management and environment separation (dev/stage/prod)
- [ ] Privacy policy, Terms of Service, cookie banner (if analytics/ads)

---

## Observability & Analytics
- [ ] Error tracking (Sentry)
- [ ] Analytics (PostHog/GA4) with consent management
- [ ] Structured app logs for critical flows (checkout, payment)

---

## Incident Log

### 2024-11-01 – Razorpay authentication failures during checkout
- **Impact:** Razorpay modal failed to open; shoppers received HTTP 401/403 on `/api/razorpay/create-order`, blocking payments during client testing via ngrok.
- **Root cause:** API routes loaded stale environment variables, so Razorpay rejected credentials and Supabase lookups mismatched the authenticated user.
- **Resolution:** Added centralized env loader with overrides, improved checkout error handling, tightened order ownership checks, rotated Razorpay keys, and verified via direct API call.
- **Follow up:** Keep `.env.local` authoritative, restart dev servers after secret changes, prefer Razorpay test keys for early testing, and monitor `vercel dev` logs for 4xx responses.

---

## QA & Testing
- [ ] Unit tests for hooks/utils (React Testing Library)
- [ ] E2E tests (Playwright) covering add‑to‑cart, checkout happy path, login
- [ ] Load test checkout API path (k6/Artillery) for smoke

---

## CI/CD & Environments
- [ ] GitHub Actions: lint, typecheck, unit tests, build
- [ ] Preview deployments on PRs
- [ ] Production deploy with environment promotion and migrations gating

---

## Roadmap (High‑Level)

Phase 1 — Catalog + Images + Cart (1–2 weeks)
- [ ] Finalise schema, migrate, seed products with images
- [ ] Replace static product sources with Supabase
- [ ] Fix image paths and filenames; add currency formatting

Phase 2 — Checkout + Payments + Orders (1–2 weeks)
- [ ] Address form, shipping, coupons
- [ ] Razorpay/Stripe integration + webhooks
- [ ] Orders DB + order history UI

Phase 3 — Admin + SEO + Performance (1–2 weeks)
- [ ] Admin panel for products and orders
- [ ] Product detail pages with schema.org, sitemap
- [ ] A11y and Lighthouse budget; image optimisation

Phase 4 — CMS + Search + Extras
- [ ] CMS for blog and marketing pages
- [ ] Search autosuggest (Algolia or Supabase)
- [ ] PWA, dark mode, i18n (optional)

---

## Immediate Fix List (from current codebase review)
- [ ] Fix `/image/...` -> `/images/...` across code
- [ ] Normalise `public/images/dryfruits` filenames (no spaces; kebab‑case)
- [ ] Add `products` to Supabase types and refactor `useProducts`
- [ ] Replace static arrays in `src/config/products.ts` and category pages
- [ ] Implement currency formatter and remove corrupted symbols in strings
- [ ] Fix `useAuth` to not set Promise as state
- [ ] Restrict `user_roles` insert policy; add FKs and indexes noted above
- [ ] Render cart/wishlist product names/images from DB join or follow‑up fetch

Notes:
- Use `ImageWithFallback` for robustness; specify width/height where possible.
- Prefer Slug‑based routing for product details; ensure unique `slug`.

This PRD is a living document. Update checkboxes and scope as milestones are reached.
