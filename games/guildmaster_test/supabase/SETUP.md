# Supabase setup for Guildmaster Arena

## 1. Create the project

Create a Supabase project and keep its region reasonably close to most players.

In **Project Settings → API**, copy:

- Project URL
- Publishable key (or legacy `anon` key)

Never put the service-role/secret key in `data/online.json` or any browser file.

## 2. Configure authentication

In **Authentication → URL Configuration**:

1. Set **Site URL** to the public URL that serves Guildmaster.
2. Add the exact Guildmaster page URL to **Redirect URLs**.
3. Keep Email authentication enabled.
4. Configure SMTP before a public launch; the development mail service is rate-limited.

Arena uses email magic-link authentication. Players do not need a Guildmaster password.

## 3. Apply the database migration

Either paste `migrations/001_arena.sql` into Supabase **SQL Editor** and run it, or use the CLI from this directory:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migration creates:

- `profiles`
- `arena_parties`
- `arena_ratings`
- `arena_matches`
- transactional `finalize_arena_match(...)` rating function
- indexes and Row Level Security

Direct browser access to these tables is revoked. The authenticated Edge Functions are the API boundary.

## 4. Deploy the Edge Functions

From `guildmaster_test`:

```powershell
supabase functions deploy publish-party
supabase functions deploy arena-data
supabase functions deploy fight-arena
```

Supabase automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions. Do not add the service-role key to the repository.

## 5. Enable the browser client

Edit `data/online.json`:

```json
{
  "enabled": true,
  "supabaseUrl": "https://YOUR_PROJECT_REF.supabase.co",
  "publishableKey": "YOUR_PUBLISHABLE_KEY"
}
```

The publishable key is intended for browser use. Database writes still remain protected because Arena tables have no direct client grants and all mutations go through authenticated functions.

## 6. Serve over HTTPS

Magic links and persistent browser sessions should be tested on the real HTTPS site. Add both production and local development URLs to the Supabase redirect allow-list when necessary.

## 7. Smoke test with two accounts

1. Sign in as account A and publish a defense.
2. Sign out, sign in as account B, and publish another defense.
3. Confirm account A appears as an opponent for B.
4. Challenge A and verify that the result appears in both accounts’ history.
5. Verify that both ratings changed by opposite amounts.
6. Reuse the same request ID through an API client and verify it does not award rating twice.

## Current integrity boundary

Match simulation, result insertion, and rating changes are server-authoritative. Character progression is not yet authoritative because roster and equipment data originate in browser `localStorage`. The publish function rejects malformed and extreme snapshots, but a determined user can still fabricate a plausible party.

Before calling Arena fully competitive, move cloud saves and reward-generating progression events behind authenticated server validation. Until then the UI intentionally labels Arena **Online Beta**.
