# TODO.md — everything-mcp

Open work and recently-done, for continuity. Pairs with `AGENTS.md` / `MEMORY.md`.
**Last updated:** 2026-07-22

## Open

- [ ] **Redeploy source → runtime.** The running MCP loads
      `%USERPROFILE%\servers\src\everything-mcp\index.js`, a copy that has diverged
      from this repo. Sync it (copy or symlink) so runtime matches `main`, then restart
      Claude Code.
- [ ] **Add a real build step.** With no `esbuild`/build script, `bundle/index.mjs` is
      hand-edited to mirror `index.js` (error-prone). A `scripts.build` (esbuild:
      `--bundle --platform=node --format=esm --outfile=bundle/index.mjs`) would
      regenerate it — verify the banner/shims match the current bundle first.

## Done (2026-07-22)

- [x] Config-driven `ES_PATH`; removed dead hardcoded default (`c1755b6`).
- [x] Untracked `.mcp.json`, added `.mcp.json.example` template (`c1755b6`).
- [x] Security: absolute-path `resolveEsPath()`, no bare-filename spawn (`d4f08f8`).
- [x] Merged PR #13 (setup-node bump) and deleted its branch.
- [x] Added `AGENTS.md` / `MEMORY.md` / `TODO.md`.
- [x] `.gitattributes` — LF normalization, kills the CRLF churn (`3fed2f8`).
- [x] Dependabot #29 — override `@hono/node-server` to `>=2.0.5` (→ 2.0.11) (`36ec58f`).
- [x] Sanitized the maintainer's local path (username → `%USERPROFILE%`) in the docs.
