# Infinite Leverage — Distribution Overrides (operator-provisioned, browser workspace)

**This file overrides the bundled `infiniteleverage-init` / `infiniteleverage-onboard`
Phase 1 prerequisites.** Those skills are the original Mac-Mini flow where each person
signs up for everything themselves. In THIS distribution that is not how it works — so
when running the IL flow, follow the rules below over anything in `phase1-manual.md`.

## RULE 0 — ACCOUNT IDENTITY IS ABSOLUTE (do this FIRST, every run)

Everything is built under **the CLIENT's own accounts only.** The operator's personal
or paid accounts, and ANY account that happens to already be signed in, are **NEVER** to
be used. Before scaffolding, pushing to GitHub, or creating a database — before creating
*anything* — run this pre-flight and HARD STOP:

1. Print exactly who is authenticated:
   - GitHub:  `gh auth status` and `gh api user --jq .login`
   - Supabase: list organizations **and their plan** via the Supabase MCP
2. STOP and make the operator confirm in words:
   > "I'm about to build under GitHub = `<login>` and Supabase org = `<name>` (`<plan>`).
   >  Confirm this is the CLIENT's own account before I create anything."
3. **REFUSE to proceed** — do not scaffold, push, or create a DB — if ANY of these hold:
   - the connected account is not the client's own clean account, **or**
   - the Supabase org is a pre-existing / **paid (Pro)** org instead of a fresh Free org
     created for THIS client, **or**
   - you are not certain.
   Instead, instruct re-authentication as the client (`gh auth login`; reconnect the
   Supabase connector as the client) and then re-run this pre-flight from step 1.
4. **A price quote means the WRONG account is connected.** If creating a resource would
   cost money (e.g. Supabase quotes $10/mo because the org is Pro), that is proof you are
   on the wrong account. **STOP and switch accounts. Never offer to pay, and never create
   a paid resource to work around it.**

This rule overrides everything else. When in doubt, stop and ask — never silently build
under whatever account happens to be connected.

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
