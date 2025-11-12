#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { spawn } = require("child_process");
const path = require("path");

// Path to es.exe - can be overridden via environment variable
const ES_PATH = process.env.ES_PATH || "C:\\Users\\danie\\scoop\\apps\\everything\\current\\es.exe";

/**
 * Execute es.exe with the given arguments
 */
function executeEverything(args) {
  return new Promise((resolve, reject) => {
    const process = spawn(ES_PATH, args);
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0 && code !== 1) {
        // code 1 is used for no results found
        reject(new Error(`es.exe exited with code ${code}: ${stderr}`));
      } else {
        resolve({ stdout, stderr, code });
      }
    });

    process.on("error", (err) => {
      reject(new Error(`Failed to execute es.exe: ${err.message}`));
    });
  });
}

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: "everything-mcp",
    version: "1.0.0",
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
    tools: [
      {
        name: "search",
        description:
          "Search for files and folders using Everything search engine. Supports powerful search syntax including wildcards, operators, and filters.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Search query using Everything syntax (e.g., 'claude config', '*.js', 'ext:exe;dll size:>1mb')",
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return (default: 50)",
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
              enum: [
                "name",
                "path",
                "size",
                "extension",
                "date-created",
                "date-modified",
                "date-accessed",
              ],
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
              description: "Search only within this parent path",
            },
          },
          required: ["query"],
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
              description: "Full path or filename to get information about",
            },
          },
          required: ["filename"],
        },
      },
    ],
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search") {
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

      const esArgs = [];

      // Add search options
      if (regex) esArgs.push("-regex");
      if (caseSensitive) esArgs.push("-case");
      if (wholeWord) esArgs.push("-whole-word");
      if (matchPath) esArgs.push("-match-path");

      // Limit results
      esArgs.push("-n", String(maxResults));

      // File/folder filtering
      if (foldersOnly) esArgs.push("/ad");
      if (filesOnly) esArgs.push("/a-d");

      // Parent path filtering
      if (parentPath) {
        esArgs.push("-parent-path", parentPath);
      }

      // Sorting
      if (sortBy) {
        const sortOrder = sortDescending ? "-descending" : "-ascending";
        esArgs.push(`-sort-${sortBy}${sortOrder}`);
      }

      // Display columns
      if (showSize) esArgs.push("-size");
      if (showDateModified) esArgs.push("-date-modified");

      // Add the search query
      esArgs.push(query);

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
      const { filename } = args;

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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Everything MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
