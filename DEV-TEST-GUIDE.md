# Infinite Leverage Browser Workspace — Executive Summary & Dev Test Guide

**Repo:** https://github.com/yon-create/il-workspace
**Launch link:** https://codespaces.new/yon-create/il-workspace?quickstart=1

---

## Executive Summary

This is a **browser-based Infinite Leverage (IL) workspace.** It lets a non-technical
client stand up their full stack — a live website, a CRM, and the IL AI team — **without
installing anything on their computer.**

**The problem it kills:**
- **Install hell** — no Homebrew, Xcode tools, Node, or CLI setup on the client's machine.
- **CAPTCHA / account hell** — the client signs up for nothing new; everything chains off
  one GitHub account.
- **Cross-OS + old hardware** — works the same on an old Mac, old Windows, Chromebook, or
  phone, because all the heavy software runs in the cloud.

**How it works:**
- The client opens a **GitHub Codespace** (a cloud Linux machine) in their browser. The IL
  toolchain (git, gh, Node, Vercel, Resend, Claude Code) is **pre-baked into the image.**
- The Codespace boots straight into **Claude Code**, which runs the IL setup flow and does
  the technical work, guided step by step.
- **GitHub is the master key:** the Codespace runs under the client's GitHub, so their repo
  is created under their account, and **Vercel / Supabase / Resend are all connected via
  "Continue with GitHub"** — no new emails or passwords.
- **Hard guardrails** prevent the system from ever building under the wrong account (e.g. an
  operator's personal or paid account): a price quote is treated as proof of a wrong account
  and the flow stops.

**What the client needs:** a **GitHub account** + a **Claude account**. That's it.
(Optional: a Gemini API key for AI image generation — offered during setup, skippable, addable later.)

**Outcome:** their own GitHub repo, their own Supabase/Vercel/Resend (all under their GitHub),
and a live website + CRM — generated entirely in the browser.

---

## Architecture at a glance

| Layer | What it is | Where it lives |
|---|---|---|
| Toolchain | `.devcontainer/` — Linux image with the full IL CLI stack | Cloud (Codespace) |
| IL brain | `.claude/` — the IL skills, agents, rules, + account guardrails | Cloud, pre-baked |
| Entry point | auto-launched `claude` (the IL flow) opens as an editor tab on load | Cloud |
| Identity | client's **GitHub** (opens the Codespace) → Vercel/Supabase/Resend via GitHub SSO | Client's accounts |
| Output | their repo + Supabase DB + Vercel site + CRM | Client's accounts / cloud |

---

## What a tester needs

- A **GitHub account** (this stands in for "the client").
- A **Claude account** (Pro/Max, or be ready to sign in when prompted).
- *(Optional)* a **Gemini API key** to test the image-generation path.
- A current **Chrome or Edge** browser. (To test the old-device path, also try a phone via
  https://claude.ai/code.)

> Test as a *fresh client*: ideally use a GitHub account that has **no** pre-existing
> Supabase/Vercel orgs, so you can confirm the "everything created clean under one GitHub"
> claim. Do **not** reuse an account tied to a paid Supabase org — the guardrail will (correctly) stop.

---

## Test walkthrough

Each step lists the **expected result**.

1. **Open the workspace.** Sign into GitHub as your test account, then open
   `https://codespaces.new/yon-create/il-workspace?quickstart=1`.
   → A VS Code editor loads in the browser. First build takes ~3–5 min (watch "Building
   codespace…" / creation log). **Nothing installs on your computer.**

2. **Confirm the toolchain (optional sanity check).** Open a terminal and run:
   `claude --version && node --version && gh --version && vercel --version`
   → All resolve. `gh auth status` shows **your** GitHub account (the one that opened the Codespace).

3. **Land in Claude Code.** When the editor finishes loading, a **Claude tab opens
   automatically** and prompts you to sign in.
   → Sign in with your Claude account. No Copilot Chat tab competing (it's removed).

4. **Run the IL flow + verify the account guardrail (RULE 0).** The flow starts. Before it
   creates anything, it should **print the GitHub identity it's using and confirm it's yours**,
   and it must **refuse to use any pre-existing or paid account.**
   → Identity shown = your test GitHub. If you point it at a paid Supabase org, it **stops**
   and tells you to switch — it must never quote/charge $ to proceed.

5. **Connect services via GitHub (RULE 1).** When prompted for Vercel / Supabase / Resend,
   each should be connected with **"Continue with GitHub"** using the same account.
   → Each account is created under your GitHub. Supabase lands in **your own free org** ($0).

6. **Generation + deploy.** The flow scaffolds the Next.js site + CRM, pushes to **your**
   GitHub repo, and deploys to **your** Vercel.
   → A live `*.vercel.app` URL works. A repo exists under your GitHub. The CRM DB exists in
   your free Supabase org. **No charges anywhere.**

7. **Gemini (optional).** When offered image generation, try **both**: skip it (build
   continues, Designer notes "image generation pending"), and/or paste a Gemini key (Designer
   activates).
   → Skipping never blocks the build; adding a key later works.

---

## Acceptance criteria (the "did it pass?" checklist)

- [ ] Zero software installed on the tester's computer
- [ ] Workspace ran fully in the browser (also spot-check a phone via claude.ai/code)
- [ ] Only **GitHub + Claude** accounts were used by the tester
- [ ] **No** pre-existing / operator / `edge8` account was touched
- [ ] **No** dollar charge was incurred or quoted
- [ ] Repo created under the tester's GitHub
- [ ] Vercel, Supabase, Resend all created via "Continue with GitHub" (same identity)
- [ ] Supabase DB landed in the tester's **free** org
- [ ] Live website URL loads; CRM is wired to the DB
- [ ] Gemini skip works; Gemini add-later works

---

## Test matrix (device/browser coverage)

| Device | Surface | Expected |
|---|---|---|
| Modern laptop/desktop | Codespaces (Chrome/Edge) | Full experience |
| Old Mac/Windows w/ current Chrome installed | Codespaces | Full experience |
| Very old machine / phone | https://claude.ai/code (same repo) | Lighter path, same IL flow |

---

## Known caveats (so you don't file false bugs)

- **Brief Copilot flash during build.** The "hide Copilot" settings only apply *after* the
  Codespace finishes building; the Copilot icon may flash for a second during cold start.
  Steady state (after load) is clean.
- **Org policy / Settings Sync** can re-introduce Copilot if a GitHub org enforces it or a
  user's personal Settings Sync re-adds it — out of repo control.
- **Claude Code Activity-Bar icon** is known to occasionally not appear after a rebuild
  (extension bug). The **terminal `claude`** is the reliable door; the panel is also reachable
  via Status Bar **`✱ Claude Code`** or Command Palette → **"Claude Code: Open in Side Bar"**.
- **First build is slow** (~3–5 min). Subsequent opens are fast.

---

## Reporting

For each test run, note: device/OS + browser, which step failed (if any), the expected vs
actual result, and a screenshot of the creation log or terminal if relevant. File issues at
https://github.com/yon-create/il-workspace/issues.
