# TODO.md — everything-mcp

Open work and recently-done, for continuity. Pairs with `AGENTS.md` / `MEMORY.md`.
**Last updated:** 2026-07-22

## Open

- [ ] **Kill the CRLF churn.** Add `.gitattributes` (`* text=auto eol=lf`), then
      `git add --renormalize .` and commit. ~17 files currently show dirty as pure
      line-ending flips; this clears them all and stops it recurring.
- [ ] **Dependabot alert #29** (moderate) on the default branch — review and patch.
      `https://github.com/danielsimonjr/everything-mcp/security/dependabot/29`
- [ ] **Redeploy source → runtime.** The running MCP loads
      `C:\Users\USER\servers\src\everything-mcp\index.js`, a copy that has diverged
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
