#!/usr/bin/env bash
# il-start — the single entry point for the Infinite Leverage Workspace.
#
#   il-start --provision   Idempotent boot setup. Seeds ~/.claude/{rules,skills,agents}
#                          from the workspace's bundled .claude/ so the IL brain is
#                          globally available and absolute paths in the skills resolve.
#                          Bakes NO secrets — all auth happens via in-browser OAuth.
#
#   il-start               The "Start" button. Launches Claude Code straight into the
#                          Infinite Leverage setup flow. The user types nothing.
set -euo pipefail

# --- Locate the workspace root (the folder that contains .claude/) -----------
find_repo_root() {
  if [ -n "${IL_WORKSPACE:-}" ] && [ -d "${IL_WORKSPACE}/.claude" ]; then
    printf '%s\n' "${IL_WORKSPACE}"; return 0
  fi
  local dir="${PWD}"
  while [ "${dir}" != "/" ]; do
    [ -d "${dir}/.claude" ] && { printf '%s\n' "${dir}"; return 0; }
    dir="$(dirname "${dir}")"
  done
  # Codespaces / devcontainer default mount
  for c in /workspaces/*; do
    [ -d "${c}/.claude" ] && { printf '%s\n' "${c}"; return 0; }
  done
  return 1
}

provision() {
  local root; root="$(find_repo_root)" || {
    echo "il-start: could not find the workspace .claude/ folder." >&2; exit 1; }
  echo "▶ Provisioning Infinite Leverage workspace from: ${root}"

  mkdir -p "${HOME}/.claude/agents" "${HOME}/.claude/skills" "${HOME}/.claude/rules"

  # Seed rules, skills, agents (skip agents if none bundled yet).
  [ -d "${root}/.claude/rules" ]  && cp -R "${root}/.claude/rules/."  "${HOME}/.claude/rules/"  2>/dev/null || true
  [ -d "${root}/.claude/skills" ] && cp -R "${root}/.claude/skills/." "${HOME}/.claude/skills/" 2>/dev/null || true
  if [ -d "${root}/.claude/agents" ] && [ -n "$(ls -A "${root}/.claude/agents" 2>/dev/null)" ]; then
    cp -R "${root}/.claude/agents/." "${HOME}/.claude/agents/" 2>/dev/null || true
  fi

  echo "✓ Seeded ~/.claude/{rules,skills,agents}"
  echo "  Tools: $(command -v claude >/dev/null && echo claude) $(command -v node >/dev/null && echo node) $(command -v git >/dev/null && echo git) $(command -v gh >/dev/null && echo gh) $(command -v vercel >/dev/null && echo vercel) $(command -v resend >/dev/null && echo resend) $(command -v jq >/dev/null && echo jq) $(command -v ffmpeg >/dev/null && echo ffmpeg)"
}

start() {
  cat <<'BANNER'

  ┌───────────────────────────────────────────────┐
  │   Infinite Leverage — Workspace                 │
  │   Everything is installed. Nothing to set up.   │
  └───────────────────────────────────────────────┘

  Launching Claude Code. If a sign-in link appears, open it in your
  browser, approve, and come back — that's the only sign-in you need.

BANNER

  if ! command -v claude >/dev/null 2>&1; then
    echo "il-start: Claude Code (claude) is not installed in this image." >&2
    exit 1
  fi

  # Launch Claude Code straight into the IL setup flow. Auth (if needed) is
  # handled interactively by Claude Code itself on first run.
  exec claude "Use the infiniteleverage-init skill to set up my Infinite Leverage system. I am non-technical — walk me through it one clear step at a time, and do the technical work for me wherever you can."
}

case "${1:-}" in
  --provision) provision ;;
  ""|--start)  start ;;
  *) echo "Usage: il-start [--provision]" >&2; exit 2 ;;
esac
