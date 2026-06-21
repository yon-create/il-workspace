# Operator Provisioner

This is how you (the operator) remove the signup gauntlet for clients. You sign up
**once** for each provider; every client is then stamped out from your master accounts
with one command. The client registers for nothing but their own domain.

## One-time setup

1. Create master accounts: **Supabase**, **Vercel** (Pro team — Hobby is non-commercial),
   **Resend**, **Google Gemini**. These are the only CAPTCHAs anyone ever faces.
2. Own one **parent domain** (e.g. `il-clients.com`) with DNS in one place you control.
3. `cd operator && npm install`
4. `cp .env.example .env` and fill in your master tokens.

## Provision a client

```bash
# dry run first — validates inputs, makes zero API calls
npm run provision -- acme --domain=acme.com --dry-run

# real run
npm run provision -- acme --domain=acme.com
```

This will, idempotently:
1. **Supabase** — create `il-acme` under your org, wait until healthy, pull the URL +
   anon + service_role keys, and apply `supabase/migrations/0001_init.sql`.
2. **Vercel** — create the `il-acme` project (root dir `website`, framework Next.js),
   set all env vars on production/preview/development, attach the client's domain.
3. **Inject** — write `clients/acme/website/.env.local` for local parity.
4. **Ledger** — record `acme → {supabase_ref, vercel_id, domain}` in `clients.json`.

It does **not** deploy — deploys flow through `git push` → Vercel CI/CD, per
`.claude/rules/global-engineering.md`. After provisioning, point the client's domain
DNS at Vercel and let the normal IL build flow ship the site.

## Cost ceilings to plan for

| Provider | Free tier | When you pay |
|---|---|---|
| Supabase | 2 active projects / org | Client #3 → paid org (~$10/project/mo) |
| Vercel | Hobby = non-commercial | **Pro team from client #1** (paying clients) |
| Resend | 3000/mo, 100/day, 1 domain | As aggregate email volume grows |
| Gemini | per-project quota | Split per-client keys if image-gen throttles |

## Security

- `operator/.env` holds master tokens — git-ignored, `chmod 600`, never committed.
- Each client's `.env.local` holds only **that** client's Supabase keys + shared
  Resend/Gemini keys — no master token ever reaches a client workspace.
- Blast radius of a leaked client key = that one client's data.
