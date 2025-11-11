# Welcome to your project

## Project info

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/23bf365f-078f-410f-a3a6-f10604944855) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev -- --host 0.0.0.0 --port 5173
```

> **Heads up:** running `vercel dev` directly can proxy the build through a Node bridge, which serves the Vite client bundle with the wrong MIME type (resulting in a blank page). Always use `npm run dev` (or `npm run dev -- --host 0.0.0.0 --port 5173` when testing on another device or tunnel) for local development.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/23bf365f-078f-410f-a3a6-f10604944855) and click on Share -> Publish.

## Testing & QA

- `npm run test:e2e` – launches the Playwright smoke suite. By default the tests start `npm run preview` on port 4173; set `E2E_BASE_URL` if you want to target a deployed URL (e.g., `E2E_BASE_URL=https://your-ngrok-url npx playwright test`).
- GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, `npm run build`, installs Playwright browsers, and executes the same suite on every push/PR.

These tests cover homepage rendering, category listing, and individual product detail pages so that we catch routing/Supabase regressions before shipping.

## Razorpay configuration

To accept payments in production, configure the following environment variables for both the frontend deployment (Vercel) and the Supabase Edge functions:

- `RAZORPAY_KEY_ID` – your public key, exposed to the browser when creating the checkout session.
- `RAZORPAY_KEY_SECRET` – your private key, used server-side when creating Razorpay orders.
- `RAZORPAY_WEBHOOK_SECRET` – shared secret for verifying Razorpay webhooks.
- `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` – PostHog project write key + host for client analytics capture.
- `POSTHOG_API_KEY` – PostHog server key for the API routes (use the same key as `VITE_POSTHOG_KEY`).
- `RESEND_API_KEY`, `ORDER_FROM_EMAIL` – credentials for sending order-confirmation emails via Resend. Optional; if omitted emails are skipped.
- `SUPABASE_SERVICE_ROLE_KEY` must be present before running any migration scripts (e.g., the image migration below).
- `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION` – credentials for Shiprocket API access. Optional during development; when present the backend will auto-book shipments after successful payments.
- `SHIPROCKET_DEFAULT_*` – fallback parcel dimensions/weight fed to Shiprocket if products don’t specify their own values.

Remember to update the webhook URL inside the Razorpay dashboard to point to `/api/razorpay/webhook` of your deployed site so that order statuses are synchronised once a payment is captured.

### Managing secrets in each environment

- **Local development** – create a `.env.local` file (ignored by git) with the three variables so `npm run dev` and the API routes can read them. The API handlers now auto-load `.env.local`, `.env.development.local`, and `.env`, so once the file exists you no longer need to `export` variables in each shell session (works even when tunnelling via ngrok). Example:
  ```ini
  RAZORPAY_KEY_ID=rzp_test_...
  RAZORPAY_KEY_SECRET=...
  RAZORPAY_WEBHOOK_SECRET=...
  ```
  Share these only with trusted teammates and rotate them if they leak.
- **Production deploys (Lovable/Vercel)** – open the project settings and add the same variables under *Environment Variables*. Both Lovable and Vercel inject them at runtime so they never live in your git history. Update them in every environment you deploy (Preview, Staging, Production) so the API route can create Razorpay orders everywhere.
- **GitHub** – if you run CI/CD from GitHub Actions, store the variables as *Repository secrets* (e.g., `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) and reference them in your workflow files. This keeps automated deploy scripts from hard-coding sensitive values. Limit access to collaborators who truly need it.
- **Supabase Edge Functions** – mirror the same variables in the Supabase dashboard under *Project Settings → API → Config Variables* so webhook verification and any background jobs can read them.

Never commit `.env` files or paste keys directly into source. If a secret changes, rotate it in every location (dashboard, hosting, CI) and redeploy so the new value propagates.

### Choosing a webhook secret

- The webhook secret is **not** generated by Razorpay. You choose it, store it in your deployment environment as `RAZORPAY_WEBHOOK_SECRET`, and paste the exact same value into the Razorpay Dashboard when you create the webhook. Razorpay includes an HMAC signature of every webhook payload using this shared secret, and the handler at `api/razorpay/webhook.ts` recomputes the signature to confirm the request really came from Razorpay.
- Pick a long, random string—32 bytes or more—and treat it like a password. A common approach is to generate hex using `openssl rand -hex 32` or base64 using `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Password managers and secret vaults can also create and store these tokens.
- Avoid short or human-generated strings. Razorpay’s signature is only as strong as the secret you pick; using a high-entropy random value prevents attackers from guessing it and spoofing webhook calls.

### What the new Razorpay helpers do

- `src/lib/razorpay.ts` lazily injects Razorpay’s hosted checkout script the first time a shopper starts the payment flow. This keeps the initial bundle light while still letting the checkout page call `ensureRazorpay()` and construct the modal on demand.
- `src/vite-env.d.ts` declares the minimal TypeScript interfaces for the global `window.Razorpay` constructor so our React components remain type-safe even though the SDK is loaded from Razorpay’s CDN instead of npm.
- `api/razorpay/create-order.ts` is the serverless function that signs Razorpay REST requests with `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` and returns an order ID for the browser checkout widget. Without these credentials the modal cannot be opened.
- `api/razorpay/verify-payment.ts` validates Razorpay signatures server-side and only marks an order as paid after the signature check passes.
- `api/orders/cancel.ts` lets the checkout flow safely cancel a pending order when the modal is dismissed.

### Admin panel

- Visit `/admin` (dark theme) to manage catalogue data once your user has the `admin` role in `public.user_roles`.
- Product changes are logged in `product_audit_logs`. The migration also provisions a public storage bucket (`product-images`) for catalogue imagery.
- If you created the project before the storage migration, run `npm run migrate:product-images` (with `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` exported) to upload the legacy `/public/images` assets into Supabase Storage and rewrite the corresponding product URLs.
- Admin accounts must enroll in TOTP-based MFA. On first login the dashboard redirects to `/admin/mfa` where a QR code is generated and verified before any privileged routes are available. Existing admins can invite or revoke team members from `/admin/team`.
- If Shiprocket credentials are present, the backend manifests prepaid orders automatically and the admin orders screen exposes buttons to generate shipments or refresh tracking data.
- Product variants (weight/pack sizes) are managed under each product. You can add multiple variants, set one as default, control inventory per weight, and toggle visibility without duplicating the product record.

### Verifying your webhook form in the Razorpay dashboard

- **Webhook URL** should match the public origin of your deployment with `/api/razorpay/webhook` appended. For example, if your site is served from `https://nidhisfruits.ddns.net`, the screenshot’s URL of `https://nidhisfruits.ddns.net/api/razorpay/webhook` is correct.
- **Secret** must exactly match the `RAZORPAY_WEBHOOK_SECRET` stored in your hosting environment so the handler can validate signatures.
- **Alert Email** is optional; Razorpay uses it to notify you if deliveries fail.
- **Active Events** control which webhook payloads Razorpay sends. To mirror the behaviour of the checkout flow in this repo, enable:
  - `payment.authorized` and `payment.captured` so you can confirm that the payment succeeded.
  - `payment.failed` to mark orders as cancelled if a payment is declined.
  - `order.paid` if you want a redundant notification once Razorpay settles the order.
  You can leave the dispute events disabled unless you plan to automate dispute handling; they generate emails anyway and can be enabled later without redeploying code.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
