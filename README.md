# Tripo

Secure multi-page web app for Tripo with:

- Supabase Auth for login and registration
- Password recovery flow
- Supabase Postgres for app data
- Row Level Security so users cannot change other users' data
- Separate pages for auth, dashboard, trip discovery, trip creation, trip detail, and profile
- Host-only trip edit and delete flow
- Profile self-update flow
- Members-only chat and participant visibility
- Report issue flow and SOS support UI
- No seeded demo users or demo trips

## Files added for security

- `config.js`
- `supabase-schema.sql`

## Main pages

- `login.html`
- `register.html`
- `forgot-password.html`
- `dashboard.html`
- `trips.html`
- `create-trip.html`
- `trip.html`
- `edit-trip.html`
- `profile.html`

## Important security rule

Use the Supabase `anon` key in `config.js`.

Do not put the Supabase `service_role` key in this frontend.

## Setup

1. Create a free Supabase project.
2. In Supabase, open the SQL Editor.
3. Run everything from `supabase-schema.sql`.
4. In `config.js`, replace:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY`
5. In Supabase Auth settings, set your site URL to your deployed app URL.
6. If you want email verification, keep confirmation emails enabled.

## Local run

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`.

## Free deployment

### Netlify

1. Create a free Netlify account.
2. Drag this folder into Netlify manual deploy.
3. After deploy, copy the live URL.
4. Add that URL into Supabase Auth site URL and redirect URL settings.
5. Re-deploy if you changed `config.js`.

### GitHub Pages

1. Push this folder to a GitHub repository.
2. Enable GitHub Pages from `main` and `/root`.
3. Copy the live URL.
4. Add that URL into Supabase Auth site URL and redirect URL settings.
5. Commit your final `config.js` values and redeploy.

## Security behavior in this version

- Only authenticated users can access app pages.
- Only the profile owner can read and update their profile row.
- Only the trip host can update or delete their trip.
- Only members can read trip chat.
- Only members and host can read participant lists.
- Only the authenticated user can create their own memberships, messages, and reviews.
- Reports are stored per authenticated reporter.
- Demo users, demo sessions, and demo trips are removed.

## Note

This project is now structured for real deployment security, but it still needs your own Supabase project configured before it will run end-to-end.
