# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

MCP server for [Everything](https://www.voidtools.com/), the blazing-fast Windows file search engine. Provides instant file/folder search through MCP by wrapping the `es.exe` command-line interface.

**Platform:** Windows only

## Development

```bash
npm install        # Install dependencies
node index.js      # Run server locally
```

No build step required - plain CommonJS JavaScript.

## Architecture

Single-file server (`index.js`) using `@modelcontextprotocol/sdk`:

- **executeEverything()**: Spawns `es.exe` with arguments, returns stdout/stderr
- **ListToolsRequestSchema handler**: Defines two tools (`search`, `get_file_info`)
- **CallToolRequestSchema handler**: Executes tools by building es.exe argument arrays
- **Transport**: StdioServerTransport for MCP communication

## External Dependency

Requires `es.exe` (Everything command-line tool):
- Default path: `C:\Program Files\Everything\es.exe`
- Scoop: `C:\Users\<user>\scoop\apps\everything\current\es.exe`
- Override via `ES_PATH` environment variable

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
