# Agent Workflow Guidelines

This repo uses a feature-branch and small, incremental commits workflow. Follow this checklist whenever making changes through Codex or locally.

## Golden Rules
- Always work on a feature branch, never directly on `main`.
- Make small, focused commits with clear messages.
- Push branches to `origin` and open a PR to merge into `main`.
- Never include secrets in commits. Use environment variables.

## Standard Flow
1) Create a branch
   - `git checkout -b feature/<short-topic>`
2) Make a focused change
   - Update code/docs/tests for a single concern
3) Commit
   - `git add <paths>`
   - `git commit -m "<type>(scope): short description"`
     - Examples: `docs(prd): add full roadmap`, `chore(images): normalize paths`, `feat(products): seed supabase products`
4) Push and PR
   - `git push -u origin feature/<short-topic>`
   - Open PR, request review, ensure CI is green

## Commit Types
- feat: user-facing feature
- fix: bug fix
- docs: documentation or PRD updates
- chore: tooling, configs, refactors without feature impact
- perf: performance improvements
- test: tests added/updated

## Additional Notes
- Prefer migrations for DB changes (keep `supabase/migrations` authoritative).
- Regenerate Supabase types after schema changes.
- Avoid committing large binaries; use Storage/CDN for media.
- Keep PRs under ~300 lines where practical for reviewability.

> Remember: commit early, commit often, in small, reviewable patches.

