# AGENTS.md — everything-mcp

How to operate on this repo without breaking it. Read this **and** `MEMORY.md` before
making changes. Pairs with `TODO.md` (open work).

## What this is

MCP server (`@danielsimonjr/everything-mcp`, Windows-only) that wraps `es.exe` — the
command-line client for [Everything](https://www.voidtools.com/) — and exposes two
tools: `search` and `get_file_info`.

**Stack:** TypeScript on Bun, MCP SDK v2 (`@modelcontextprotocol/server` + `/core`),
Zod tool schemas, `McpServer.registerTool` + `serveStdio`.

## The five things that bite

1. **Source vs plugin bundle — rebuild after source edits.**
   - `src/*.ts` — the source Bun runs in development.
   - `bundle/index.js` — the **built** ESM artifact `.mcp.json` launches with `node`
     (`${CLAUDE_PLUGIN_ROOT}/bundle/index.js`). Self-contained so the plugin cache
     does not need `node_modules`.
   - Regenerate with `bun run build`. Do not hand-edit the bundle. The old
     `bundle/index.mjs` / CommonJS `index.js` pair is gone.

2. **The running server is NOT this repo (on the maintainer's machine).**
   Claude Code may load a *separate copy* under the plugin cache or
   `%USERPROFILE%\servers\src\…`. Changes here do **not** affect the running MCP
   until redeployed / marketplace-refreshed. See `TODO.md`.

3. **CRLF churn — normalize to LF before staging.**
   `.gitattributes` enforces LF, but editors can still flip files. Before staging:
   ```bash
   tr -d '\r' < src/server.ts > src/server.ts.tmp && mv -f src/server.ts.tmp src/server.ts
   git diff HEAD --stat -- src/server.ts   # should be tiny
   ```
   Confirm a suspected EOL flip with: `git diff HEAD --ignore-all-space -- <file>`
   (empty = pure EOL, no real change).

4. **Stage narrowly — never `git add -A`.**
   Stage only the files you changed (`git add src/ bundle/index.js package.json bun.lock …`)
   and verify with `git status --short` (first column = staged) before committing.
   After a build, stage `bundle/index.js` with the matching source change.

5. **`es.exe` must resolve to an ABSOLUTE path — never a bare filename.**
   On Windows, `spawn("es.exe", …)` lets `CreateProcess` search the current working
   directory first → binary-planting / search-path hijack. `resolveEsPath()` enforces
   this: if `ES_PATH` is set it must be absolute; otherwise it probes known install
   dirs (Program Files, Program Files (x86), winget Links, scoop) and throws if none
   exist. Do not reintroduce a bare-`es.exe` fallback. Resolution is **lazy** (first
   tool call) so `initialize` / `tools/list` work in CI without `es.exe`.

## Config

- Set `ES_PATH` (absolute path to `es.exe`) in the MCP config `env` block —
  `.mcp.json` (local) or `.claude.json` (the maintainer's runtime).
- `.mcp.json` is **gitignored** in some workflows but is also force-tracked for the
  plugin; prefer editing `.mcp.json.example` as the template for docs.
- Local Bun-first run: `bun run src/index.ts` (requires `bun install`).

## Git

- `main` has branch protection: **2 required status checks** (build ubuntu + windows).
  A maintainer push can bypass; PRs should let CI pass first.
- Verify a push landed by SHA, not exit code:
  `git rev-parse HEAD` == `git ls-remote origin -h refs/heads/main | cut -f1`.
- Dependabot PRs: merge (squash) with `--delete-branch` once checks are green.

## Sanity checks before commit

```bash
bun run typecheck
bun test
bun run build
bun run smoke
bun run scripts/stdio-smoke.ts node bundle/index.js
git diff --cached | grep -i "$USERNAME" || echo "no personal path staged"
```
