/**
 * Everything MCP server core — McpServer factory, es.exe helpers, tools.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export const SERVER_NAME = "everything-mcp";
export const SERVER_VERSION = "3.1.0";

/**
 * Resolve es.exe to an ABSOLUTE path. Never spawn a bare filename on Windows,
 * where CreateProcess searches the current working directory first (a
 * binary-planting risk). Set ES_PATH to override; otherwise probe known
 * install locations and fail loudly if none are found.
 */
export function resolveEsPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.ES_PATH;
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error(`ES_PATH must be an absolute path, got: ${configured}`);
    }
    return configured;
  }
  const candidates = [
    path.join(env.ProgramFiles || "C:\\Program Files", "Everything", "es.exe"),
    path.join(
      env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
      "Everything",
      "es.exe",
    ),
    path.join(
      env.LOCALAPPDATA || "",
      "Microsoft",
      "WinGet",
      "Links",
      "es.exe",
    ),
    path.join(
      env.USERPROFILE || "",
      "scoop",
      "apps",
      "everything",
      "current",
      "es.exe",
    ),
  ].filter((p) => p && fs.existsSync(p));
  if (candidates.length) return candidates[0]!;
  throw new Error(
    "es.exe not found. Set the ES_PATH environment variable to its absolute path (see .mcp.json).",
  );
}

/** Lazy so `tools/list` / initialize work in CI without es.exe present. */
let cachedEsPath: string | undefined;

export function resetEsPathCache(): void {
  cachedEsPath = undefined;
}

function esPath(): string {
  if (!cachedEsPath) cachedEsPath = resolveEsPath();
  return cachedEsPath;
}

export type ExecuteResult = {
  stdout: string;
  stderr: string;
  code: number | null;
};

/**
 * Execute es.exe with the given arguments.
 */
export function executeEverything(
  args: string[],
  exePath: string = esPath(),
): Promise<ExecuteResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(exePath, args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      // code 1 is used for no results found
      if (code !== 0 && code !== 1) {
        reject(new Error(`es.exe exited with code ${code}: ${stderr}`));
      } else {
        resolve({ stdout, stderr, code });
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to execute es.exe: ${err.message}`));
    });
  });
}

const sortByEnum = z.enum([
  "name",
  "path",
  "size",
  "extension",
  "date-created",
  "date-modified",
  "date-accessed",
]);

export const searchInputSchema = z.object({
  query: z
    .string()
    .describe(
      "Search query using Everything syntax (e.g., 'claude config', '*.js', 'ext:exe;dll size:>1mb')",
    ),
  maxResults: z
    .number()
    .int()
    .positive()
    .default(50)
    .describe("Maximum number of results to return (default: 50)"),
  regex: z
    .boolean()
    .default(false)
    .describe("Use regular expression search"),
  caseSensitive: z.boolean().default(false).describe("Match case"),
  wholeWord: z
    .boolean()
    .default(false)
    .describe("Match whole words only"),
  matchPath: z
    .boolean()
    .default(false)
    .describe("Match full path and filename"),
  foldersOnly: z.boolean().default(false).describe("Return only folders"),
  filesOnly: z.boolean().default(false).describe("Return only files"),
  sortBy: sortByEnum
    .optional()
    .describe(
      "Sort results by: name, path, size, extension, date-created, date-modified, date-accessed",
    ),
  sortDescending: z
    .boolean()
    .default(false)
    .describe("Sort in descending order"),
  showSize: z
    .boolean()
    .default(false)
    .describe("Include file size in results"),
  showDateModified: z
    .boolean()
    .default(false)
    .describe("Include date modified in results"),
  path: z
    .string()
    .optional()
    .describe(
      "Search INSIDE this folder, including its subfolders. This is the usual " +
        '"search in this directory" option (es.exe -path). Example: ' +
        String.raw`"C:\Users\me\Code" matches C:\Users\me\Code\proj\a.csproj.`,
    ),
  parentPath: z
    .string()
    .optional()
    .describe(
      "Search inside the PARENT of this path -- NOT inside the path itself " +
        "(es.exe -parent-path). Example: " +
        String.raw`"C:\Users\me\Code" searches C:\Users\me. ` +
        'For "search in this folder", use `path` instead.',
    ),
  parent: z
    .string()
    .optional()
    .describe(
      "Match only items whose IMMEDIATE parent folder is exactly this path, " +
        "excluding deeper subfolders (es.exe -parent). Example: " +
        String.raw`"C:\Users\me\Code" matches C:\Users\me\Code\a.csproj ` +
        String.raw`but not C:\Users\me\Code\proj\a.csproj.`,
    ),
});

export const getFileInfoInputSchema = z.object({
  filename: z
    .string()
    .describe("Full path or filename to get information about"),
});

function textResult(text: string, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    ...(isError ? { isError: true } : {}),
  };
}

/**
 * Build a configured McpServer.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    "search",
    {
      description:
        "Search for files and folders using Everything search engine. Supports powerful search syntax including wildcards, operators, and filters.",
      inputSchema: searchInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      try {
        const {
          query,
          maxResults,
          regex,
          caseSensitive,
          wholeWord,
          matchPath,
          foldersOnly,
          filesOnly,
          sortBy,
          sortDescending,
          showSize,
          showDateModified,
          path: searchPath,
          parentPath,
          parent,
        } = args;

        const esArgs: string[] = [];

        if (regex) esArgs.push("-regex");
        if (caseSensitive) esArgs.push("-case");
        if (wholeWord) esArgs.push("-whole-word");
        if (matchPath) esArgs.push("-match-path");

        esArgs.push("-n", String(maxResults));

        if (foldersOnly) esArgs.push("/ad");
        if (filesOnly) esArgs.push("/a-d");

        // Three distinct es.exe scopes, and they are easy to confuse -- issue #27 was
        // filed because only `-parent-path` was exposed and its description read as
        // though it meant `-path`. Verified against es.exe directly:
        //   -path        <dir>  items inside dir, recursively
        //   -parent-path <dir>  items inside dir's PARENT
        //   -parent      <dir>  items whose immediate parent is exactly dir
        if (searchPath) {
          esArgs.push("-path", searchPath);
        }
        if (parentPath) {
          esArgs.push("-parent-path", parentPath);
        }
        if (parent) {
          esArgs.push("-parent", parent);
        }

        if (sortBy) {
          const sortOrder = sortDescending ? "-descending" : "-ascending";
          esArgs.push(`-sort-${sortBy}${sortOrder}`);
        }

        if (showSize) esArgs.push("-size");
        if (showDateModified) esArgs.push("-date-modified");

        esArgs.push(query);

        const result = await executeEverything(esArgs);
        return textResult(result.stdout || "No results found");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return textResult(`Error: ${message}`, true);
      }
    },
  );

  server.registerTool(
    "get_file_info",
    {
      description:
        "Get detailed information about a specific file including size, dates, and attributes",
      inputSchema: getFileInfoInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ filename }) => {
      try {
        const esArgs = [
          "-size",
          "-date-created",
          "-date-modified",
          "-date-accessed",
          "-attributes",
          "-n",
          "1",
          filename,
        ];
        const result = await executeEverything(esArgs);
        return textResult(result.stdout || "File not found");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return textResult(`Error: ${message}`, true);
      }
    },
  );

  return server;
}
