# MatchMetric — Cloudflare Pages + Supabase

A responsive football prediction and performance-tracking website starter. Built with React, Vite, TypeScript and Supabase. It is configured for Cloudflare Pages static hosting.

## Important before launch

- The project name **MatchMetric** is provisional.
- The initial preview includes clearly labelled demonstration data. It is not real betting history.
- No football data provider is connected. Predictions and scores are entered manually in the first release.
- The admin screen currently supports publishing individual predictions. Full accumulator publishing, result-settlement UI, audit-log workflows, AdSense activation and a production 90-day archive are planned integration steps, not represented as finished features.
- Do not advertise a 70% hit rate unless your actual, timestamped settled record supports it.
- Never place a Supabase `service_role` key in this frontend project.

## 1. Run locally

Install Node.js 20 or later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite.

## 2. Configure Supabase

1. Create a Supabase project.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `supabase/migrations/001_initial_schema.sql` from this project.
4. Paste the complete SQL into the SQL Editor and run it.
5. Open **Project Settings → API** (or API Keys).
6. Copy the Project URL and the publishable/anon key.
7. Put them in `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

Restart the dev server after changing environment variables.

## 3. Create the first administrator

1. In Supabase, open **Authentication → Users**.
2. Create the administrator user with an email and password.
3. In **SQL Editor**, run this query, replacing the email:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_ADMIN_EMAIL';
```

4. Sign in from the site's Admin workspace.

New users receive the `user` role by default. Do not expose an admin signup route.

## 4. Deploy to Cloudflare Pages

This is a Vite static application and is suitable for Cloudflare Pages.

1. Push the project folder to a GitHub repository.
2. In Cloudflare, open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository.
4. Set the build command to `npm run build`.
5. Set the build output directory to `dist`.
6. Add these environment variables in the Cloudflare Pages project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy.

The `public/_redirects` file provides SPA route fallback should client-side routes be added later.

## 5. Database notes

The SQL migration creates:
- `profiles`
- `predictions`
- `accumulators`
- `accumulator_selections`
- `prediction_audit_logs`
- `site_settings`
- `ad_placements`

It enables Row Level Security and grants public read access only to published predictions and enabled/public content. Admin write access is checked against `profiles.role = 'admin'`.

The migration uses a secure admin predicate. Keep the `service_role` key private.

## 6. Current functionality

- Responsive dark sports-analytics UI.
- Overview dashboard and market navigation.
- Goals and double-chance filtering.
- Search and results/status filters.
- Accumulator shortlist with combined decimal odds and copy-to-clipboard.
- Statistics breakdown from loaded records.
- Supabase connection and public prediction loading.
- Password sign-in for an existing Supabase administrator.
- Admin form to publish individual predictions.
- Responsible betting disclaimer.
- Demo mode when Supabase environment variables are absent.

## 7. Before a public launch

Recommended next development steps:
1. Add a dedicated result settlement interface and immutable audit events.
2. Add accumulator publication and settlement from prediction legs.
3. Enforce a database rule preventing publication after kick-off.
4. Add a proper date-bounded 90-day query and pagination.
5. Add server-side aggregation/RPC for complete performance metrics.
6. Add team and competition reference tables and optional football API integration.
7. Add legal pages, privacy/cookie consent and an age/responsible gambling notice appropriate to target markets.
8. Review Google AdSense eligibility and policies before placing live ads.
9. Run accessibility, security and production smoke tests.

## Scripts

- `npm run dev` — local development
- `npm run typecheck` — TypeScript check
- `npm run build` — production build
- `npm run preview` — preview production output
