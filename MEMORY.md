# MEMORY.md — everything-mcp (current state)

Point-in-time state. Pairs with `AGENTS.md` (how to operate) and `TODO.md` (open work).
**Last updated:** 2026-09-05

## What it is

`@danielsimonjr/everything-mcp` v3.0.0 — Windows-only MCP server wrapping `es.exe`
(Everything CLI). Tools: `search`, `get_file_info`.

**Stack:** TypeScript on Bun · MCP SDK v2 (`McpServer` + `registerTool` + Zod) ·
`serveStdio` · built plugin artifact at `bundle/index.js` (`bun build --target=node`).

## Recent changes (2026-09-05)

- **v3.0.0 — TypeScript-on-Bun + idiomatic MCP 2.0.** Replaced CommonJS `index.js` /
  hand-synced `bundle/index.mjs` with `src/*.ts`, Bun as package manager, and a real
  `bun run build` that regenerates `bundle/index.js`. Switched from low-level
  `Server` + `setRequestHandler("tools/…")` to `McpServer.registerTool` with Zod
  input schemas. Wire protocol still negotiates `2025-11-25` (SDK `LATEST_PROTOCOL_VERSION`).
- Earlier the same day: **v2.0.0** swapped `@modelcontextprotocol/sdk` →
  `@modelcontextprotocol/{server,core}@2` while still on CommonJS / low-level `Server`.

## Runtime gotcha (maintainer's machine)

The MCP that actually runs may be a **separate copy** (plugin cache or
`%USERPROFILE%\servers\src\…`), not this working tree. Repo commits do not change
the running server until redeployed / marketplace-refreshed. A **Claude Code restart**
is needed to pick up changed `ES_PATH` / plugin bits.

## Environment facts

- Package manager: **Bun** (`bun.lock`). `package-lock.json` removed.
- `.gitattributes` enforces LF.
- `main` branch protection: 2 required status checks (build ubuntu + windows).
- CI uses `oven-sh/setup-bun`, runs typecheck / test / build / stdio smoke on
  ubuntu + windows.
