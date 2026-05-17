# Tripo

Tripo is a multi-page social travel web app with:

- Supabase Auth for account login
- Supabase Postgres + RLS for protected data access
- Admin console with user, trip, and report management
- AI travel matching, safety scoring, chat moderation, trip planning, risk signals, and profile summaries
- Phone OTP verification through Twilio Verify
- Vercel-ready serverless APIs for all secret-backed features

## What is production-ready in this version

- Users cannot edit other users' profiles or trips
- Verified accounts are required before creating or joining trips
- Women-only trips block male accounts at the database-policy level
- Men-only trips block female accounts at the database-policy level
- Raw database/system messages are no longer shown directly to users
- AI and OTP secrets stay on the server through Vercel environment variables

## Important security truth

Frontend code will always be visible in the browser. That is normal for every web app.

What must stay secret has been moved or prepared to move server-side:

- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_AUTH_TOKEN`

Never place those in `config.js`.

## Local run

```powershell
py -m http.server 8000
```

Open `http://localhost:8000`.

## Supabase setup

1. Create a Supabase project.
2. Open `SQL Editor`.
3. Run the full `supabase-schema.sql` file in a fresh blank query tab.
4. Put your public values in `config.js`:
   - `supabaseUrl`
   - `supabaseAnonKey`
5. In `Authentication -> URL Configuration`, add:
   - `http://localhost:8000/**`
   - your Vercel production URL
   - your custom domain URL
6. Add your admin email:

```sql
insert into public.admin_users (email)
values ('you@example.com')
on conflict (email) do nothing;
```

## Twilio phone OTP setup

Tripo now expects phone verification before users create or join trips.

1. Create a Twilio account.
2. Open `Verify`.
3. Create a Verify Service.
4. In Vercel project environment variables, add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_VERIFY_SERVICE_SID`

## OpenAI setup

To enable the AI features on production:

1. Add `OPENAI_API_KEY` in Vercel.
2. Optionally add `OPENAI_MODEL`.

Without an OpenAI key, Tripo falls back to rule-based matching and moderation logic for core safety behavior.

## Vercel deployment

### 1. Import the GitHub repo

1. Open [Vercel](https://vercel.com/).
2. Click `Add New...` -> `Project`.
3. Import `kb1218/tripo`.
4. Framework preset:
   - `Other`
5. Build command:
   - leave empty
6. Output directory:
   - leave empty

Vercel docs for Git deployments: [Deployments overview](https://vercel.com/docs/deployments/overview)

### 2. Add environment variables in Vercel

Add these in `Project Settings -> Environment Variables`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

### 3. Redeploy

After adding env vars, redeploy the project once from Vercel.

## Connect `trip0.in` from Hostinger to Vercel

Vercel’s current custom-domain flow is documented here: [Set up custom domain](https://vercel.com/docs/domains/set-up-custom-domain)

Recommended setup:

1. In Vercel, open your Tripo project.
2. Go to `Settings -> Domains`.
3. Add:
   - `trip0.in`
   - `www.trip0.in`
4. Vercel will show the DNS records you need.

Typical DNS pattern from Vercel docs:

- Apex domain like `trip0.in`:
  - `A` record to `76.76.21.21`
- `www` subdomain:
  - `CNAME` to the Vercel-provided target

Then in Hostinger:

1. Open `Domains`
2. Open `DNS / Zone Editor`
3. Remove old conflicting records for `@` or `www`
4. Add the exact records Vercel shows
5. Save

Once DNS propagates, Vercel will provision HTTPS automatically.

## Final production checklist

1. Supabase schema applied
2. `config.js` updated with public Supabase values
3. Vercel environment variables added
4. Supabase redirect URLs updated for:
   - localhost
   - Vercel URL
   - `https://trip0.in`
   - `https://www.trip0.in`
5. Twilio Verify configured
6. OpenAI key added
7. Admin email inserted into `admin_users`

## Investor prep next

Once production is stable, prepare:

- live demo URL
- product demo video
- 10-slide deck
- traction sheet
- 1-city launch metrics
- trust and safety narrative
