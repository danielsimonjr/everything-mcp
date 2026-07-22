# AGENTS.md — everything-mcp

How to operate on this repo without breaking it. Read this **and** `MEMORY.md` before
making changes. Pairs with `TODO.md` (open work).

## What this is

MCP server (`@danielsimonjr/everything-mcp`, Windows-only, CommonJS) that wraps
`es.exe` — the command-line client for [Everything](https://www.voidtools.com/) —
and exposes two tools: `search` and `get_file_info`. Depends on
`@modelcontextprotocol/sdk`.

## The five things that bite

1. **Two copies of the code — edit both, or the fix is cosmetic.**
   - `index.js` — the source (CommonJS, `package.json main`).
   - `bundle/index.mjs` — the **built** ESM bundle that `.mcp.json` actually launches
     (`${CLAUDE_PLUGIN_ROOT}/bundle/index.mjs`).
   - There is **no build script** (`package.json scripts` is `{}`) and no esbuild in
     `node_modules`. So the bundle is **not regenerated** — you must hand-port any
     `index.js` change into `bundle/index.mjs` and keep them in sync. The bundle has a
     `__require` shim, so `__require("fs")` / `__require("path")` work inside it.

2. **The running server is NOT this repo (on the maintainer's machine).**
   Claude Code loads a *separate copy* at
   `%USERPROFILE%\servers\src\everything-mcp\index.js` via `.claude.json`. Changes
   here do **not** affect the running MCP until they are redeployed to `servers\src`
   (or `.claude.json` is repointed). See `TODO.md`.

3. **CRLF churn — normalize to LF before staging.**
   No `.gitattributes` + `core.autocrlf=false`. Any editor that saves CRLF flips the
   **entire file** to "modified" (every line `-`/`+`, equal insert/delete counts). If
   you `git add` such a file you commit thousands of noise lines that bury the real
   change. Before staging an edited file:
   ```bash
   tr -d '\r' < index.js > index.js.tmp && mv -f index.js.tmp index.js
   git diff HEAD --stat -- index.js   # should be tiny
   ```
   Confirm a suspected EOL flip with: `git diff HEAD --ignore-all-space -- <file>`
   (empty = pure EOL, no real change).

4. **Stage narrowly — never `git add -A`.**
   The working tree usually has ~17 CRLF-flipped files that are NOT yours. Stage only
   the files you changed (`git add index.js bundle/index.mjs ...`) and verify with
   `git status --short` (first column = staged) before committing.

5. **`es.exe` must resolve to an ABSOLUTE path — never a bare filename.**
   On Windows, `spawn("es.exe", ...)` lets `CreateProcess` search the current working
   directory first → binary-planting / search-path hijack. `resolveEsPath()` enforces
   this: if `ES_PATH` is set it must be absolute; otherwise it probes known install
   dirs (Program Files, Program Files (x86), winget Links, scoop) and throws if none
   exist. Do not reintroduce a bare-`es.exe` fallback.

## Config

- Set `ES_PATH` (absolute path to `es.exe`) in the MCP config `env` block —
  `.mcp.json` (local) or `.claude.json` (the maintainer's runtime).
- `.mcp.json` is **gitignored** (holds the real machine path). `.mcp.json.example` is
  the committed template — edit a copy, don't commit your real one.

## Git

- `main` has branch protection: **2 required status checks** (build ubuntu + windows).
  A maintainer push can bypass; PRs should let CI pass first.
- Verify a push landed by SHA, not exit code:
  `git rev-parse HEAD` == `git ls-remote origin -h refs/heads/main | cut -f1`.
- Dependabot PRs: merge (squash) with `--delete-branch` once checks are green.

## Sanity checks before commit

```bash
node --check index.js
node --check bundle/index.mjs
git diff --cached | grep -i "$USERNAME" || echo "no personal path staged"
```
