# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCP server for [Everything](https://www.voidtools.com/), the blazing-fast Windows file search engine. Provides instant file/folder search through MCP by wrapping the `es.exe` command-line interface.

**Platform:** Windows only  
**Runtime:** TypeScript on Bun (MCP SDK v2)

## Development

```bash
bun install          # Install dependencies
bun run src/index.ts # Run server locally (stdio)
bun test             # Unit tests
bun run typecheck    # tsc --noEmit
bun run build        # Bundle → bundle/index.js (node-target, for the plugin)
bun run smoke        # Live stdio initialize + tools/list
```

## Architecture

TypeScript sources under `src/`, using `@modelcontextprotocol/server` v2:

- **`createServer()`** (`src/server.ts`): Builds an `McpServer` and `registerTool`s `search` + `get_file_info` with Zod input schemas
- **`resolveEsPath()` / `executeEverything()`**: Absolute-path-only `es.exe` discovery and spawn
- **`src/index.ts`**: `serveStdio(() => createServer())` entrypoint
- **`bundle/index.js`**: `bun build` output launched by `.mcp.json` via `node` (self-contained; no `node_modules` required at plugin runtime)

## External Dependency

Requires `es.exe` (Everything command-line tool):
- Default probe: Program Files / Program Files (x86) / WinGet Links / Scoop
- Override via `ES_PATH` environment variable (must be absolute)

## Tools

| Tool | Purpose |
|------|---------|
| `search` | Search files/folders with Everything syntax (wildcards, regex, size/date filters, sorting) |
| `get_file_info` | Get file details (size, dates, attributes) |

## Everything Search Syntax Reference

- Wildcards: `*.txt`, `file?.doc`
- Boolean: `file AND doc`, `txt OR doc`, `NOT backup`
- Extensions: `ext:jpg;png;gif`
- Size: `size:>1mb`, `size:1mb..10mb`
- Dates: `dm:today`, `dc:lastweek`, `da:thismonth`
- Path: `path:C:\Users\`, `parent:Downloads`
