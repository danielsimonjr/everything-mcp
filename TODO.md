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

- [ ] **The published bundle can never match the tag: we commit `bundle/index.js` AND
      rebuild it in `prepublishOnly`.** Found while publishing v3.0.0 (2026-09-06).
      `prepublishOnly` runs `bun run build`, so the tarball carries a *fresh* bundle while
      the tag carries the committed one. Measured on this release:

      | copy | sha256 (first 16) |
      | --- | --- |
      | committed on `main` / `v3.0.0` | `b4aa252ddf5e9283` |
      | published in the npm tarball | `66ed487702e85062` |

      The two are **semantically identical** — the diff is pure minifier identifier churn
      (`Of`→`Xf`, `Se`→`ve`, `Rr`→`nr`), 10 lines of renaming in a 388 kB file. `bun build`
      is not byte-deterministic across runs, so this is not staleness and re-running will
      not converge them. Nothing is wrong with the published package: it answers an MCP
      `initialize` under `node` and reports `3.0.0`, which is how it was verified before
      release.

      But it means **the shipped artifact is not reproducible from the tag**, which is the
      property that makes "verify the deployed image" checkable at all. Pick one:
      - **stop committing `bundle/`** (gitignore it; the plugin's `.mcp.json` path would
        then need the build to run at install, which is a real constraint — check it), or
      - **stop rebuilding at publish** (drop `bun run build` from `prepublishOnly`, keeping
        `typecheck` and `smoke`, so the tarball ships exactly the reviewed bytes).

      The second is the smaller change and keeps the plugin path working unchanged. Doing
      both — as now — is the only combination that guarantees divergence.
