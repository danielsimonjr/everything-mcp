# MEMORY.md — everything-mcp (current state)

Point-in-time state. Pairs with `AGENTS.md` (how to operate) and `TODO.md` (open work).
**Last updated:** 2026-07-22

## What it is

`@danielsimonjr/everything-mcp` v1.0.1 — Windows-only MCP server wrapping `es.exe`
(Everything CLI). Tools: `search`, `get_file_info`. Entry points: `index.js` (source)
and `bundle/index.mjs` (built ESM, launched by `.mcp.json`). No build step — the two
are kept in sync by hand.

## Recent changes (2026-07-22)

- **`d4f08f8` fix(security):** resolve `es.exe` to an **absolute** path via
  `resolveEsPath()`. Never spawns a bare filename (Windows CWD binary-planting risk).
  `ES_PATH`, if set, must be absolute; otherwise probes Program Files / Program Files
  (x86) / winget Links / scoop and throws if none found. Applied to `index.js` **and**
  `bundle/index.mjs`. Closes the automated-review HIGH finding introduced by `c1755b6`.
- **`c1755b6` fix:** made the `es.exe` path config-driven — removed the dead hardcoded
  `C:\Program Files\Everything\es.exe` default. Untracked `.mcp.json` (now local-only;
  it was already in `.gitignore`) and added **`.mcp.json.example`** as the distributable
  template.
- **PR #13** (`ci: bump actions/setup-node 6.4.0 → 7.0.0`, dependabot): squash-merged,
  branch `dependabot/github_actions/actions/setup-node-7.0.0` deleted. No open PRs remain.

## Why the security fix was needed

`c1755b6` fixed the *functional* bug (dead default path when `es.exe` is installed via
winget at `%LOCALAPPDATA%\Microsoft\WinGet\Links\es.exe`) but replaced the absolute
default with a bare `"es.exe"` — a *security* regression. `d4f08f8` satisfies both:
absolute-path-only **and** zero-config discovery of the winget location.

## Runtime gotcha (maintainer's machine)

The MCP that actually runs is a **separate copy** at
`%USERPROFILE%\servers\src\everything-mcp\index.js` (per `.claude.json`), not this
repo. `.claude.json` now sets `ES_PATH` to the winget path. Repo commits do not change
the running server until redeployed to `servers\src`. A **Claude Code restart** is
needed to activate a changed `.claude.json` `ES_PATH`.

## Environment facts

- No `.gitattributes`, `core.autocrlf=false` → chronic CRLF churn (~17 files show dirty
  as pure EOL flips). Normalize edited files to LF before staging.
- `main` branch protection: 2 required status checks (build ubuntu + windows).
- Dependabot flagged 1 moderate vuln on the default branch (alert #29) — see `TODO.md`.
