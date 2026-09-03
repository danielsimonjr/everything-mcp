#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Resolve es.exe to an ABSOLUTE path. Never spawn a bare filename on Windows,
// where CreateProcess searches the current working directory first (a
// binary-planting risk). Set ES_PATH to override; otherwise probe known
// install locations and fail loudly if none are found.
function getDefaultEsPaths(env = process.env) {
  return [
    path.win32.join(env.ProgramFiles || "C:\\Program Files", "Everything", "es.exe"),
    path.win32.join(
      env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
      "Everything",
      "es.exe"
    ),
    env.LOCALAPPDATA &&
      path.win32.join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Links", "es.exe"),
    env.USERPROFILE &&
      path.win32.join(env.USERPROFILE, "scoop", "apps", "everything-cli", "current", "es.exe"),
  ].filter(Boolean);
}

function resolveEsPath() {
  const configured = process.env.ES_PATH;
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error(`ES_PATH must be an absolute path, got: ${configured}`);
    }
    return configured;
  }
  const candidates = getDefaultEsPaths().filter((candidate) => fs.existsSync(candidate));
  if (candidates.length) return candidates[0];
  throw new Error(
    "es.exe not found. Set the ES_PATH environment variable to its absolute path (see .mcp.json)."
  );
}
const ES_PATH = resolveEsPath();
const MAX_RESULTS = 1000;
const SORT_FIELDS = [
  "name",
  "path",
  "size",
  "extension",
  "date-created",
  "date-modified",
  "date-accessed",
];

const TOOL_DEFINITIONS = [
  {
    name: "search",
    description:
      "Search for files and folders using Everything search engine. Supports powerful search syntax including wildcards, operators, and filters.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          minLength: 1,
          description:
            "Search query using Everything syntax (e.g., 'claude config', '*.js', 'ext:exe;dll size:>1mb')",
        },
        maxResults: {
          type: "integer",
          minimum: 1,
          maximum: MAX_RESULTS,
          description: `Maximum number of results to return (default: 50, maximum: ${MAX_RESULTS})`,
          default: 50,
        },
        regex: {
          type: "boolean",
          description: "Use regular expression search",
          default: false,
        },
        caseSensitive: {
          type: "boolean",
          description: "Match case",
          default: false,
        },
        wholeWord: {
          type: "boolean",
          description: "Match whole words only",
          default: false,
        },
        matchPath: {
          type: "boolean",
          description: "Match full path and filename",
          default: false,
        },
        foldersOnly: {
          type: "boolean",
          description: "Return only folders",
          default: false,
        },
        filesOnly: {
          type: "boolean",
          description: "Return only files",
          default: false,
        },
        sortBy: {
          type: "string",
          description:
            "Sort results by: name, path, size, extension, date-created, date-modified, date-accessed",
          enum: SORT_FIELDS,
        },
        sortDescending: {
          type: "boolean",
          description: "Sort in descending order",
          default: false,
        },
        showSize: {
          type: "boolean",
          description: "Include file size in results",
          default: false,
        },
        showDateModified: {
          type: "boolean",
          description: "Include date modified in results",
          default: false,
        },
        parentPath: {
          type: "string",
          description: "Search only within this absolute Windows path",
        },
      },
      required: ["query"],
    },
    annotations: {
      readOnlyHint: true,
    },
  },
  {
    name: "get_file_info",
    description:
      "Get detailed information about a specific file including size, dates, and attributes",
    inputSchema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          minLength: 1,
          description: "Full path or filename to get information about",
        },
      },
      required: ["filename"],
    },
    annotations: {
      readOnlyHint: true,
    },
  },
];

function createEsExitError(code, stderr) {
  const details = stderr.trim();
  const suffix = details ? ` Details: ${details}` : "";

  if (code === 8) {
    return new Error(
      "Everything IPC is unavailable (es.exe exit code 8). Start the Everything " +
        "search client (Everything.exe, not only the Everything Service) in the " +
        "current Windows user session, wait for its database to load, and ensure " +
        `the client and es.exe use the same instance.${suffix}`
    );
  }

  if (code === 6) {
    return new Error(
      "es.exe rejected a command-line option (exit code 6). Everything MCP requires " +
        `ES 1.1.0.37 or newer for safe search argument handling.${suffix}`
    );
  }

  return new Error(`es.exe exited with code ${code}.${suffix}`);
}

function isSuccessfulEsExitCode(code) {
  return code === 0;
}

/**
 * Execute es.exe with the given arguments
 */
function executeEverything(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ES_PATH, args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (!isSuccessfulEsExitCode(code)) {
        reject(createEsExitError(code, stderr || stdout));
      } else {
        resolve({ stdout, stderr, code });
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to execute es.exe: ${err.message}`));
    });
  });
}

function buildSearchArgs(args = {}) {
  const {
    query,
    maxResults = 50,
    regex = false,
    caseSensitive = false,
    wholeWord = false,
    matchPath = false,
    foldersOnly = false,
    filesOnly = false,
    sortBy,
    sortDescending = false,
    showSize = false,
    showDateModified = false,
    parentPath,
  } = args;

  if (typeof query !== "string" || query.length === 0) {
    throw new Error("query must be a non-empty string");
  }
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > MAX_RESULTS) {
    throw new Error(`maxResults must be an integer between 1 and ${MAX_RESULTS}`);
  }
  if (sortBy !== undefined && !SORT_FIELDS.includes(sortBy)) {
    throw new Error(`sortBy must be one of: ${SORT_FIELDS.join(", ")}`);
  }
  if (
    parentPath !== undefined &&
    (typeof parentPath !== "string" ||
      !path.win32.isAbsolute(parentPath) ||
      /^[/-]/.test(parentPath) ||
      /["\0\r\n]/.test(parentPath))
  ) {
    throw new Error("parentPath must be a safe absolute Windows path");
  }

  // ES 1.1.0.37+ can use CommandLineToArgvW, avoiding its legacy custom
  // parser's quoting edge cases when Node passes paths containing spaces.
  const esArgs = ["-argv"];
  if (regex) esArgs.push("-regex");
  if (caseSensitive) esArgs.push("-case");
  if (wholeWord) esArgs.push("-whole-word");
  if (matchPath) esArgs.push("-match-path");
  esArgs.push("-n", String(maxResults));
  if (foldersOnly) esArgs.push("/ad");
  if (filesOnly) esArgs.push("/a-d");
  if (parentPath) esArgs.push("-path", parentPath);
  if (sortBy) {
    const sortOrder = sortDescending ? "-descending" : "-ascending";
    esArgs.push(`-sort-${sortBy}${sortOrder}`);
  }
  if (showSize) esArgs.push("-size");
  if (showDateModified) esArgs.push("-date-modified");

  // ES 1.1.0.37+ treats everything after -- as search text, preventing
  // user-controlled queries from being interpreted as switches such as -exit.
  esArgs.push("--", query);
  return esArgs;
}

function buildFileInfoArgs(args = {}) {
  const { filename } = args;
  if (typeof filename !== "string" || filename.length === 0) {
    throw new Error("filename must be a non-empty string");
  }

  return [
    "-argv",
    "-size",
    "-date-created",
    "-date-modified",
    "-date-accessed",
    "-attributes",
    "-n",
    "1",
    "--",
    filename,
  ];
}

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: "everything-mcp",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOL_DEFINITIONS,
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search") {
      const esArgs = buildSearchArgs(args);

      const result = await executeEverything(esArgs);

      return {
        content: [
          {
            type: "text",
            text: result.stdout || "No results found",
          },
        ],
      };
    } else if (name === "get_file_info") {
      const esArgs = buildFileInfoArgs(args);

      const result = await executeEverything(esArgs);

      return {
        content: [
          {
            type: "text",
            text: result.stdout || "File not found",
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  // Exit cleanly when our stdio pipe closes (e.g., Claude Code's
  // /reload-plugins). Without this, the spawned `es.exe` child handles can
  // keep the event loop alive after the transport closes, leaving an orphan.
  process.stdin.on("end", () => process.exit(0));
  process.stdin.on("close", () => process.exit(0));

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Everything MCP server running on stdio");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = {
  MAX_RESULTS,
  SORT_FIELDS,
  TOOL_DEFINITIONS,
  buildFileInfoArgs,
  buildSearchArgs,
  createEsExitError,
  getDefaultEsPaths,
  isSuccessfulEsExitCode,
};
