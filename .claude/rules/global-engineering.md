# Global Engineering Rules

## Git
- Run `git status` before any file work.
- Never force-push to any branch.
- Never skip hooks with `--no-verify`.
- Never use `git add .` or `git add -A` — stage files explicitly by name.
- Never create a commit unless explicitly instructed.

## Branch and PR discipline
- Never push directly to `main` or `master`. All changes go through a pull request.
- Confirm the correct base branch before opening a PR.

## Deployment
- Never deploy using `vercel deploy` or `vercel --prod` directly.
- All deployments through `git push` → CI/CD only.

## Secrets
- Never commit `.env` files, API keys, tokens, or passwords.
- Never include secrets in code, comments, or commit messages.

## Approvals
- Social posts → draft for approval first.
- Email campaigns → ALWAYS require human approval before sending.

## Destructive operations
- Always confirm with the user before: `rm -rf`, `git reset --hard`, dropping database tables.
