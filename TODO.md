# TODO.md — everything-mcp

Open work and recently-done, for continuity. Pairs with `AGENTS.md` / `MEMORY.md`.
**Last updated:** 2026-09-05

## Open

- [ ] **Redeploy source → runtime.** Sync the running Claude Code plugin / servers
      copy so runtime matches `main`, then restart Claude Code.
- [ ] **Publish `@danielsimonjr/everything-mcp@3.0.0` to npm** after CI is green
      (Bun is required for the `bin` entry that runs `src/index.ts`; the plugin
      path keeps using the node-target `bundle/index.js`).

## Done (2026-09-05)

- [x] TypeScript-on-Bun migration (`src/`, `bun.lock`, `tsconfig.json`).
- [x] Idiomatic MCP 2.0: `McpServer` + `registerTool` + Zod (replacing low-level
      `Server` / `setRequestHandler` method-string handlers).
- [x] Real build step: `bun run build` → `bundle/index.js`; removed hand-edited
      `bundle/index.mjs` and CommonJS `index.js`.
- [x] CI on Bun (typecheck, test, build, stdio smoke) for ubuntu + windows.
- [x] Lazy `resolveEsPath()` so initialize / tools/list work without `es.exe`.

## Done (2026-07-22)

- [x] Config-driven `ES_PATH`; removed dead hardcoded default (`c1755b6`).
- [x] Untracked `.mcp.json`, added `.mcp.json.example` template (`c1755b6`).
- [x] Security: absolute-path `resolveEsPath()`, no bare-filename spawn (`d4f08f8`).
- [x] Merged PR #13 (setup-node bump) and deleted its branch.
- [x] Added `AGENTS.md` / `MEMORY.md` / `TODO.md`.
- [x] `.gitattributes` — LF normalization, kills the CRLF churn (`3fed2f8`).
- [x] Dependabot #29 — override `@hono/node-server` to `>=2.0.5` (→ 2.0.11) (`36ec58f`).
- [x] Sanitized the maintainer's local path (username → `%USERPROFILE%`) in the docs.
