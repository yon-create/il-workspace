# Infinite Leverage Workspace

A ready-to-go Infinite Leverage (IL) environment that runs **in your web browser**.
Nothing to install. No Homebrew, no Xcode, no terminal setup. Works the same on an
old Mac, an old Windows PC, or a Chromebook — because all the heavy software runs in
the cloud, not on your machine.

---

## Start here (pick the one that fits you)

### 1. Cloud workspace — recommended for laptops/desktops
Click this link:

> **▶ Open in a cloud workspace:** `https://codespaces.new/yon-create/il-workspace?quickstart=1`

It opens a full workspace in your browser with everything already installed. When it
finishes loading, click **▶ Start Infinite Leverage** in the task menu (Terminal → Run Task),
or just wait — it starts on its own.

**Browser requirement:** a current version of **Chrome** or **Edge**. If your computer is
old, install the latest Chrome first (it runs on much older systems than you'd expect).

### 2. Phone or very old computer
Open **https://claude.ai/code** in your phone's browser, sign in with your Claude account,
and point it at this repository. This is the most forgiving option for old browsers and
small screens — you get the same Infinite Leverage setup, guided step by step.

### 3. Your own computer (only if it's reasonably modern)
If you already use VS Code and have Docker, open this folder in VS Code and choose
**"Reopen in Container"** (Dev Containers extension). Same environment, running locally.

---

## What happens when you start

You don't type commands. Claude Code opens and walks you through Infinite Leverage one
step at a time. The only sign-in you need is your **Claude account** — if a link appears,
open it, approve, and come back.

Everything else (your website's database, hosting, and email) is set up for you by your
operator ahead of time — see below.

---

## For the operator (the technical person setting this up)

This repo is the **portable IL brain**: the toolchain + the IL skills, rules, and agents,
pre-baked so any non-technical user can run IL from a browser.

**What's inside:**
- `.devcontainer/` — the cloud toolchain (git, gh, node, jq, ffmpeg, Claude Code, Vercel, Resend). Linux base, runs in the cloud.
- `.claude/rules/` — `global-engineering.md` (git/deploy/secrets discipline).
- `.claude/skills/infiniteleverage-init/` and `infiniteleverage-onboard/` — the real IL setup flow, bundled so it works without installing the plugin.
- `start/il-start.sh` — boot setup (`--provision`) + the "Start" launcher.
- `.vscode/tasks.json` — the clickable **▶ Start Infinite Leverage** button.
- `operator/` — the per-client provisioner (Phase 2): see `operator/README.md`.

**One-time setup:**
1. Push this repo to your GitHub account/org (so the Codespaces link works).
2. Enable Codespaces on the repo.
3. To remove the client signup friction entirely, run the provisioner for each client
   (`operator/provision-client.ts`) — it creates their Supabase + Vercel + email from
   your master accounts and injects the secrets, so the client registers for nothing
   but their own domain.

**Security:** no secrets are baked into this image. All authentication is in-browser
OAuth at first use, or injected per-client by the operator. Never commit `operator/.env`.
