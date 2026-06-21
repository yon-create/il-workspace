# Infinite Leverage — Distribution Overrides (operator-provisioned, browser workspace)

**This file overrides the bundled `infiniteleverage-init` / `infiniteleverage-onboard`
Phase 1 prerequisites.** Those skills are the original Mac-Mini flow where each person
signs up for everything themselves. In THIS distribution that is not how it works — so
when running the IL flow, follow the rules below over anything in `phase1-manual.md`.

## RULE 0 — IDENTITY = WHOEVER OPENED THE WORKSPACE (do not interrogate)

The client IS the person who opened this Codespace. Build everything under THEIR
identity. Do not ask "which account?" — inherit it from the environment.

**GitHub — already correct, never touch it.**
In a Codespace, `gh` is automatically authenticated as the account that opened the
Codespace. That IS the client. **Use it as-is. Never ask which GitHub, never run
`gh auth login` to switch, never use any other GitHub account.** Just run
`gh api user --jq .login` once to print it for the record, then proceed.

**Supabase — the only thing that needs care.**
Supabase is a SEPARATE connector that does NOT follow the Codespace's GitHub login, so it
can wrongly carry a leftover/pre-existing account. Therefore:
- **NEVER use a pre-existing Supabase connection or any paid (Pro) org.** A pre-connected
  Supabase org that isn't the client's own is forbidden.
- The client connects THEIR OWN Supabase — and to guarantee it's the same person, have
  them authorize Supabase with **"Continue with GitHub" using the same account that
  opened the Codespace.** That makes the Supabase org unambiguously theirs.
- **A price quote = the WRONG Supabase account.** If creating the DB would cost money
  (e.g. $10/mo because the org is Pro), that is proof it's not the client's fresh free
  account. **STOP, have them connect their own Supabase, never pay, never work around it.**

This rule overrides everything else.

## RULE 1 — GITHUB IS THE MASTER KEY (the connection workflow)

The client has exactly TWO accounts: their **GitHub** (the one that opened this Codespace)
and their **Claude** account. They will NOT create standalone email/password accounts for
anything. Every external service is created/authorized by **"Continue with GitHub" using
that same GitHub account.** One identity → everything.

When the flow needs to connect a service, walk the client through GitHub SSO:

| Service | How to connect | Notes |
|---|---|---|
| **Vercel** | At vercel.com → **"Continue with GitHub"** → authorize | Creates their Vercel tied to their GitHub. Import the repo, deploy. |
| **Supabase** | Connector → **"Continue with GitHub"** (same account) | Their own free org. Create the DB there. Never a pre-existing/paid org (see RULE 0). |
| **Resend** | At resend.com/signup → **"Continue with GitHub"** | Verified: Resend supports GitHub sign-in. Then add domain + API key. |
| **Gemini** | ⚠️ Google AI Studio needs a **Google** account, NOT GitHub | The client has no Google account, so this breaks the chain. **Operator supplies a shared `GEMINI_API_KEY`, or defer image generation.** Do not ask the client to make a Google account. |
| any other ("etc.") | Prefer **"Continue with GitHub"** wherever offered | If a service has no GitHub SSO, that's the one place a separate signup is needed — flag it to the operator rather than silently creating credentials. |

Always pick the GitHub option on the sign-in screen — never email/password — so every
account stays under the client's single GitHub identity.

## The model
- The **operator** owns the paid accounts (Supabase, Vercel, Resend, Gemini) and runs
  `operator/provision-client.ts` to create each client's stack and inject the keys into
  `website/.env.local` ahead of time.
- The **client** only ever provides: their **domain**, their **business info**, and a
  **Claude login** (or the operator pre-sets `ANTHROPIC_API_KEY`, in which case the
  client provides nothing).

## Before asking the client to sign up for ANYTHING — check first
At the start of Phase 1, read `website/.env.local` (and the environment). For each
service, if the key is already present, it is **operator-provisioned — do NOT ask the
client to create an account or paste a key. Say it's already set up and move on.**

| Service | Env var to check | If present | If absent |
|---|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Skip — operator-provisioned | Ask operator to run the provisioner; do not send the client to supabase.com |
| Vercel | (operator token, server-side) | Skip — operator-provisioned | Operator handles deploy/hosting |
| Resend | `RESEND_API_KEY` | Skip — operator-provisioned (shared) | Operator handles email |
| Gemini | `GEMINI_API_KEY` | Skip — operator-provisioned (shared) | Operator handles |
| Claude Code | `ANTHROPIC_API_KEY` | Skip login — already authed | Client signs in with their Claude account (one clean login) |

## Always optional in this distribution — do NOT block on these
- **Google Workspace** — optional. It only provides a branded *receiving* inbox
  (`you@yourdomain.com`). All *outbound* mail the system sends goes through Resend.
  Offer it as a later add-on; never make it a prerequisite.
- **Lark** — optional. Team notifications only. Skip unless the operator wants it.

## Not applicable in the browser workspace — SKIP entirely
- **Homebrew install**, **git install**, **Claude Code Desktop download/install**
  (phase1-manual steps 7–8). The cloud workspace already has the full toolchain. Never
  ask the user to install anything locally.

## Net result for a properly provisioned client
Phase 1 reduces to: confirm the domain, gather business info, and (if no operator API
key) one Claude sign-in. No GitHub/Vercel/Supabase/Resend/Gemini/Google signups.
