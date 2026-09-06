#!/usr/bin/env bun
/**
 * Everything MCP server entrypoint — stdio transport.
 */

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server";

// Exit cleanly when our stdio pipe closes (e.g., Claude Code's
// /reload-plugins). Without this, spawned `es.exe` child handles can
// keep the event loop alive after the transport closes, leaving an orphan.
process.stdin.on("end", () => process.exit(0));
process.stdin.on("close", () => process.exit(0));

serveStdio(() => createServer());
console.error("Everything MCP server running on stdio");
