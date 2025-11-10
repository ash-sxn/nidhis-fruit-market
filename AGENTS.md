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
- If a task can be performed via terminal commands or MCP tools, do it yourself rather than delegating. Only request user action when something is impossible due to sandbox limitations (e.g., no network, missing credentials, or GUI-only steps).

> Remember: commit early, commit often, in small, reviewable patches.

## MCP Tools
Two Model Context Protocol (MCP) clients are available to speed up database work and front-end testing. Prefer these tools before falling back to manual steps.

### Supabase MCP (`supabase`)
- Provides direct access to the project `tjsxdyxbacyrgalqsxmb`.
- Tools: `list_tables`, `execute_sql`, `apply_migration`, `get_logs`, `list_extensions`, etc.
- Use cases:
  - Inspect schema/row counts without leaving the editor: `list_tables` or `list_extensions`.
  - Run safe, read-only queries or diagnostics: `execute_sql` with `SELECT` to confirm data before coding.
  - Apply migrations once reviewed: `apply_migration` with a new file in `supabase/migrations`.
  - Fetch Supabase docs snippets via `search_docs` when unsure about API usage.
- Remember: migrations stay authoritative—never mutate schema directly outside new migration files. When running `execute_sql`, keep it read-only unless reproducing an issue on a sandbox branch.

**Example workflow**
1. `list_tables` → confirm `product_variants` exists after a migration.
2. `execute_sql` with `SELECT count(*) FROM product_variants;` to validate data.
3. If the query reveals a schema gap, create/edit a migration locally, then run `apply_migration` after review.

### Playwright MCP (`playwright`)
- Wraps a remote Playwright instance for browser automation.
- Tools cover navigation (`browser_navigate`), input (`browser_type`, `browser_fill_form`), and verification (`browser_snapshot`, `browser_console_messages`).
- Use cases:
  - Quickly regression-test UI flows (checkout, admin login) without launching a local browser.
  - Capture screenshots or DOM snapshots to confirm layout bugs.
  - Reproduce issues reported by users on specific routes.

**Example workflow**
1. `browser_navigate` to `/checkout`.
2. `browser_fill_form` and `browser_click` to simulate a payment attempt.
3. `browser_console_messages` + `browser_snapshot` to gather evidence for the bug report.

Always document meaningful MCP actions in your notes/PR (e.g., “Validated via Supabase MCP `execute_sql` that inventory counts updated”). This keeps the team aware of remote actions that don’t show up in git history.
