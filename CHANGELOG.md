# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Noted

- **v3.0.0 released and published 2026-09-06** — tag `v3.0.0` on `99fe4a22`, GitHub release
  created, `@danielsimonjr/everything-mcp@3.0.0` on npm (verified three ways: `npm view`,
  `dist-tags latest`, and `npm pack`). The shipped bundle was health-checked *before* release
  by piping an MCP `initialize` into it under `node` — the `.mcp.json` launch path — and it
  answered `"version":"3.0.0"`.

  The first publish attempt **failed at `prepublishOnly`** with
  `TS2688: Cannot find type definition file for 'bun'`, because the publishing machine's
  `node_modules` was incomplete. `@types/bun` is declared; nothing was published. That gate
  refusing an incomplete tree is working exactly as intended.

  Recorded in `TODO.md`: the tarball's `bundle/index.js` does not match the committed one
  (`66ed4877…` vs `b4aa252d…`) because we both commit that file and rebuild it in
  `prepublishOnly`. The two are semantically identical — minifier identifier churn — but the
  release is therefore not byte-reproducible from its tag.

## [3.1.0] - 2026-09-06 - the three es.exe path scopes

Fixes [#27](https://github.com/danielsimonjr/everything-mcp/issues/27), reported by
@BradKnowles: a search for `.csproj` under `C:\Users\Brad\Code` returned results from all
of `C:\Users\Brad`.

### Added

- **`path`** — search INSIDE a folder and its subfolders (`es.exe -path`). This is the
  "search in this directory" option, and its absence is what caused #27.
- **`parent`** — match only items whose IMMEDIATE parent is exactly this path, excluding
  deeper subfolders (`es.exe -parent`).

### Fixed

- **`parentPath`'s description was actively misleading.** It read *“Search only within this
  parent path”*, which parses as “within this path” — so the model chose it for “search in
  this folder” and got the parent instead. It now states that it searches the PARENT and
  points at `path`.

  The missing options were half the bug. This description was the half that made the wrong
  answer look right.

  Verified against the real `es.exe` rather than its documentation:

  ```text
  es -parent-path ...\everything-mcp\src  ->  ...\everything-mcp\node_modules\.bin, .claude
  es -path        ...\everything-mcp\src  ->  ...\src\index.ts, server.ts, server.test.ts
  ```

All three options are optional and independent, so existing callers are unaffected.

## [3.0.0] - 2026-09-05 - TypeScript-on-Bun + idiomatic MCP 2.0

Released as a RUNTIME MAJOR. Development and the npm `bin` entry now require
[Bun](https://bun.sh). The Claude Code plugin path still launches a **node-target**
self-contained `bundle/index.js` (no Bun required on the host).

- **TypeScript on Bun.** Replaced CommonJS `index.js` with `src/index.ts` +
  `src/server.ts`. Package manager is Bun (`bun.lock`); `package-lock.json` removed.
- **Idiomatic MCP 2.0 API.** Moved from low-level `Server` +
  `setRequestHandler("tools/list"|"tools/call", …)` to `McpServer` +
  `registerTool` with Zod `inputSchema`s (`zod/v4`). `serveStdio(() => createServer())`
  remains the transport entry.
- **Real build step.** `bun run build` regenerates `bundle/index.js` via
  `bun build --target=node --format=esm`. Removed the hand-maintained
  `bundle/index.mjs` (~35k lines of vendored SDK).
- **CI.** `oven-sh/setup-bun`; runs `typecheck`, `bun test`, `build`, and a live
  stdio smoke (`initialize` + `tools/list`) on ubuntu + windows.
- **Lazy `es.exe` resolution.** `resolveEsPath()` runs on first tool call so
  handshake / `tools/list` succeed in CI without Everything installed.
- Wire protocol still negotiates `2025-11-25` (SDK `LATEST_PROTOCOL_VERSION`).

## [2.0.0] - 2026-09-05 - port to the MCP 2.0 SDK (server + core @2.0.0)

Released as a DEPENDENCY MAJOR. The runtime moved from `@modelcontextprotocol/sdk@1.x` to
`@modelcontextprotocol/{server,core}@2.x`, which is breaking for anything resolving alongside it.
**The wire protocol is UNCHANGED at `2025-11-25`** before and after -- verified by a live stdio
round trip against the shipped `bundle/index.mjs`, not the source. The v2 package major and the
protocol era are separate facts.

- Replaced `@modelcontextprotocol/sdk@1.x` with `@modelcontextprotocol/server` +
  `@modelcontextprotocol/core` @^2.0.0 in `index.js`. Not an import swap -- v2 registers
  handlers by spec method name (`setRequestHandler("tools/list", fn)` /
  `setRequestHandler("tools/call", fn)`, not by schema object -- the v1 form throws at
  runtime), and `serveStdio()` replaces `connect(new StdioServerTransport())`.
- Regenerated `bundle/index.mjs` from `index.js` with esbuild against the new
  dependency tree, rather than hand-porting ~15,000 lines of vendored v1 SDK code inline
  in the bundle -- there is no committed build script, so this was done ad hoc and the
  bundle's shim header was preserved to match the existing format.
- Verified against the BUILT bundle over a real stdio round-trip, not just a passing
  `node --check`: a live `initialize` negotiates `2025-11-25` (the SDK's actual
  `LATEST_PROTOCOL_VERSION`) and `tools/list` returns both tools (`search`,
  `get_file_info`).

## 2026-09-03 - the plugin served ZERO MCP servers

- **`.mcp.json` was missing from the default branch**, so a plugin described as
  "Everything-search instant file lookup (everything-mcp server)" shipped a skill and no
  server. Confirmed by the CLI's own component inventory: `claude plugin details everything-mcp`
  reported `MCP servers (0)` for the deployed v1.2.0.
- The server binary was present the whole time -- `bundle/index.mjs` is on `main` and answers
  an MCP `initialize` handshake with
  `serverInfo {name: everything-mcp, version: 1.2.0}, capabilities.tools`. Only the
  declaration that launches it was absent, so nothing failed loudly; the plugin simply
  provided less than its name implies.
- The file existed only on `ci/windows-leg`, a branch 41 commits behind `main` whose other
  contributions had already landed by separate routes. Recovered just this file rather than
  merging a stale line.
- `.mcp.json` is listed in `.gitignore` (line 34), which is why it never reached `main`: a
  plain `git add` silently skips it. Committed with a SCOPED `git add -f -- .mcp.json`, the
  same way `ci/windows-leg` tracks it. Never `git add -f -A`, which would sweep in
  `node_modules`.

## [Unreleased]

### Fixed

- **Version bumped to 1.2.1 so the `.mcp.json` fix in deee0bb actually DEPLOYS.** That commit
  declared the server correctly, but left the version at 1.2.0 - and the plugin cache is
  version-keyed (`plugins/cache/<marketplace>/<plugin>/<version>/`). **Measured, not assumed:**
  after deee0bb landed, `claude plugin marketplace update local-marketplace` reported success and
  the deployed `1.2.0` directory still had NO `.mcp.json`. A correct fix that never reaches the
  cache is indistinguishable, from the running machine's side, from no fix at all.
  A marketplace refresh reporting "Successfully updated" is therefore not evidence that any plugin
  changed; check the version directory for the file you shipped.

### Security

- **`qs` bumped 6.15.2 -> 6.16.0 in the lockfile** (GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g, both
  MEDIUM, runtime scope). `npm audit --omit=dev` now reports 0 vulnerabilities.
  **Scope of the exposure, measured rather than assumed:** the published package ships no lockfile,
  so a consumer installing `@danielsimonjr/everything-mcp@1.2.0` today already resolves `qs` to the
  patched 6.16.0 — verified by installing the published tarball with `--omit=dev`. What was exposed
  is anyone running `npm ci` **in this repository**, which pins the vulnerable 6.15.2. Real, but a
  developer-environment issue rather than a shipped one.


### Fixed

- **Auto-merged Dependabot commits could land on the default branch with no CI run.** The
  auto-merge workflow merges with `GITHUB_TOKEN`, and GitHub's recursion guard suppresses workflow
  triggers for pushes made with that token, so `on: push` never fires for those commits. Measured
  across this repo's recent history before changing anything. The merge gate itself holds — branch
  protection requires the checks, and auto-merge cannot merge until they pass on the pull request —
  so what is lost is post-merge telemetry: the default branch's own history goes dark for every
  auto-merged bump. CI now also runs on a nightly `schedule` (07:00 UTC) and on `workflow_dispatch`,
  so the branch is exercised regardless of who pushed it and a gap can be backfilled on the spot.
  Chosen over granting the auto-merge workflow a PAT, which would restore the trigger but widens
  that token's blast radius to close a telemetry hole rather than a gate hole. (a931f6e)

## [1.2.0] - 2026-08-12

> Rolls up two gaps: the companion-skill addition below (`1.1.0`, dated
> 2026-07-06) was documented in this CHANGELOG but never bumped in
> `package.json`, tagged in git, or published to npm — pushed is not
> published. This release carries it forward together with the security
> fixes below.

### Added

- **Windows CI leg.** CI ran on `ubuntu-latest` only — but Windows is the *production*
  platform for this MCP server (it runs on the user's Windows box), so CI had never once
  tested the OS the server actually ships on. The `build` job now runs a
  `[ubuntu-latest, windows-latest]` matrix.

### Security

- **Resolve `es.exe` to an absolute path; never spawn a bare name** (CWE-426/427,
  executable search-path hijacking / binary planting). `ES_PATH` previously fell back to
  a hardcoded `C:\Program Files\Everything\es.exe` and briefly to a bare `"es.exe"`; on
  Windows `spawn("es.exe")` makes `CreateProcess` search the CWD first. `resolveEsPath()`
  now requires an absolute `ES_PATH` (throws otherwise), probes known absolute install
  locations (Program Files, Program Files (x86), winget Links, scoop), and throws a clear
  error instead of a bare name. Mirrored in `bundle/index.mjs`.
- **Force `@hono/node-server` >= 2.0.5 via an npm `override`** (Dependabot #29 — path
  traversal in `serve-static` on Windows via an encoded backslash `%5C`). It is a
  transitive dependency of `@modelcontextprotocol/sdk` (`^1.19.9`, which capped it below
  the patch). This server uses only the stdio transport, so `serve-static` is never
  reached, but the override raises it to 2.0.11 to clear the alert.

## [1.1.0] - 2026-07-06

### Added
- **Companion skill** — `everything` (`everything-mcp:everything`,
  `/everything`), a judgment layer over the 2 tools that steers toward
  `search` for name/pattern lookups and `get_file_info` for details on a
  known path, and flags the `~\Dropbox` index-gap gotcha (fall back to a
  filesystem walk, e.g. `fzf-mcp`'s `fuzzy_search_files`). Ships at
  `skills/everything/SKILL.md`.

### Documentation
- Add CycloneDX SBOM (sbom.json).

## [1.0.1] - 2025-12-09

### Fixed
- Changed default ES_PATH from Scoop to Program Files location (`C:\Program Files\Everything\es.exe`)
- Removed misleading Scoop installation note from README (Scoop package doesn't include es.exe)

### Added
- CLAUDE.md guidance document for Claude Code
- MCP server configuration files (.mcp.json, .claude/settings.local.json)

## [1.0.0] - 2025-12-09

### Added
- Initial release
- `search` tool for file/folder search with Everything syntax
- `get_file_info` tool for file details (size, dates, attributes)
- Support for wildcards, regex, boolean operators, size/date filters
- Configurable ES_PATH via environment variable
