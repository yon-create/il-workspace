# Infinite Leverage Workspace — cloud toolchain image.
# Linux base on purpose: it runs in the cloud (Codespaces / Claude Code on the web /
# a small VM), so the user's old Mac or Windows machine only needs a browser.
# This replaces the macOS Homebrew install entirely.
FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# System tools that IL installs via Homebrew on macOS, here via apt.
# git + node + npm are already in the base image.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg jq ffmpeg zsh \
 && rm -rf /var/lib/apt/lists/*

# GitHub CLI (gh) — official apt repo.
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
 && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update && apt-get install -y gh \
 && rm -rf /var/lib/apt/lists/*

# Node global CLIs that IL installs via npm: Claude Code, Vercel, Resend.
RUN npm install -g @anthropic-ai/claude-code vercel resend

# One-button wrapper, on PATH as `il-start`.
COPY start/il-start.sh /usr/local/bin/il-start
RUN chmod +x /usr/local/bin/il-start

USER node
