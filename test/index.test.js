"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

// resolveEsPath() runs when the source module loads. The pure-function tests do
// not execute this file; they only need an absolute path to satisfy validation.
process.env.ES_PATH = path.resolve(__filename);

const {
  MAX_RESULTS,
  SORT_FIELDS,
  TOOL_DEFINITIONS,
  buildFileInfoArgs,
  buildSearchArgs,
  createEsExitError,
  getDefaultEsPaths,
  isSuccessfulEsExitCode,
} = require("../index.js");

const ROOT = path.resolve(__dirname, "..");

function getTool(name) {
  return TOOL_DEFINITIONS.find((tool) => tool.name === name);
}

test("default ES paths include Scoop's everything-cli package", () => {
  assert.deepEqual(
    getDefaultEsPaths({
      ProgramFiles: "D:\\Programs",
      "ProgramFiles(x86)": "D:\\Programs (x86)",
      LOCALAPPDATA: "C:\\Users\\alice\\AppData\\Local",
      USERPROFILE: "C:\\Users\\alice",
    }),
    [
      "D:\\Programs\\Everything\\es.exe",
      "D:\\Programs (x86)\\Everything\\es.exe",
      "C:\\Users\\alice\\AppData\\Local\\Microsoft\\WinGet\\Links\\es.exe",
      "C:\\Users\\alice\\scoop\\apps\\everything-cli\\current\\es.exe",
    ]
  );
});

function listToolsFromServer(entryPoint) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entryPoint], {
      cwd: ROOT,
      env: {
        ...process.env,
        ES_PATH: path.resolve(__filename),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let completed = false;
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Timed out listing tools from ${entryPoint}. stderr: ${stderr}`));
    }, 5000);

    function finish(error, tools) {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      child.stdin.end();
      if (error) reject(error);
      else resolve(tools);
    }

    child.on("error", (error) => finish(error));
    child.on("close", (code) => {
      if (!completed) {
        finish(new Error(`Server ${entryPoint} exited with code ${code}. stderr: ${stderr}`));
      }
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.stdout.on("data", (data) => {
      stdout += data.toString();
      const lines = stdout.split(/\r?\n/);
      stdout = lines.pop();

      for (const line of lines) {
        if (!line) continue;
        let message;
        try {
          message = JSON.parse(line);
        } catch (error) {
          finish(new Error(`Invalid JSON from ${entryPoint}: ${line}. ${error.message}`));
          return;
        }

        if (message.id === 1 && message.result) {
          child.stdin.write(
            `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`
          );
          child.stdin.write(
            `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`
          );
        } else if (message.id === 2) {
          if (message.error) {
            finish(new Error(JSON.stringify(message.error)));
          } else {
            finish(null, message.result.tools);
          }
          return;
        }
      }
    });

    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "everything-mcp-test", version: "1.0.0" },
        },
      })}\n`
    );
  });
}

test("both tools advertise accurate read-only annotations", () => {
  assert.equal(TOOL_DEFINITIONS.length, 2);
  for (const tool of TOOL_DEFINITIONS) {
    assert.deepEqual(tool.annotations, { readOnlyHint: true });
  }
});

test("maxResults schema and runtime validation use the same bounds", () => {
  const schema = getTool("search").inputSchema.properties.maxResults;
  assert.equal(schema.type, "integer");
  assert.equal(schema.minimum, 1);
  assert.equal(schema.maximum, MAX_RESULTS);

  for (const value of [0, -1, 1.5, MAX_RESULTS + 1, "10", NaN, Infinity]) {
    assert.throws(
      () => buildSearchArgs({ query: "config.toml", maxResults: value }),
      /maxResults must be an integer/
    );
  }

  assert.doesNotThrow(() => buildSearchArgs({ query: "config.toml", maxResults: 1 }));
  assert.doesNotThrow(() =>
    buildSearchArgs({ query: "config.toml", maxResults: MAX_RESULTS })
  );
});

test("search text follows the ES option boundary", () => {
  const args = buildSearchArgs({
    query: "-exit",
    maxResults: MAX_RESULTS,
    regex: true,
    caseSensitive: true,
    wholeWord: true,
    matchPath: true,
    filesOnly: true,
    sortBy: "date-modified",
    sortDescending: true,
    showSize: true,
    showDateModified: true,
    parentPath: "C:\\Users",
  });

  assert.deepEqual(args.slice(-2), ["--", "-exit"]);
  assert.deepEqual(args, [
    "-argv",
    "-regex",
    "-case",
    "-whole-word",
    "-match-path",
    "-n",
    String(MAX_RESULTS),
    "/a-d",
    "-path",
    "C:\\Users",
    "-sort-date-modified-descending",
    "-size",
    "-date-modified",
    "--",
    "-exit",
  ]);
});

test("option-bearing search fields are checked at runtime", () => {
  assert.deepEqual(getTool("search").inputSchema.properties.sortBy.enum, SORT_FIELDS);
  assert.throws(
    () => buildSearchArgs({ query: "config.toml", sortBy: "name -exit" }),
    /sortBy must be one of/
  );
  assert.throws(
    () => buildSearchArgs({ query: "config.toml", parentPath: "-exit" }),
    /parentPath must be a safe absolute Windows path/
  );
  assert.throws(
    () => buildSearchArgs({ query: "config.toml", parentPath: 'C:\\safe" -exit' }),
    /parentPath must be a safe absolute Windows path/
  );
  assert.doesNotThrow(() =>
    buildSearchArgs({ query: "config.toml", parentPath: "C:\\Users" })
  );
  assert.doesNotThrow(() =>
    buildSearchArgs({ query: "config.toml", parentPath: "\\\\server\\share" })
  );
});

test("file names follow the ES option boundary", () => {
  const args = buildFileInfoArgs({ filename: "-reindex" });
  assert.equal(args[0], "-argv");
  assert.deepEqual(args.slice(-2), ["--", "-reindex"]);
});

test("required string arguments are checked at runtime", () => {
  assert.throws(() => buildSearchArgs({}), /query must be a non-empty string/);
  assert.throws(() => buildSearchArgs({ query: "" }), /query must be a non-empty string/);
  assert.throws(() => buildFileInfoArgs({}), /filename must be a non-empty string/);
  assert.throws(
    () => buildFileInfoArgs({ filename: "" }),
    /filename must be a non-empty string/
  );
});

test("only ES exit code 0 is successful", () => {
  assert.equal(isSuccessfulEsExitCode(0), true);
  for (const code of [1, 2, 6, 7, 8, 9, null]) {
    assert.equal(isSuccessfulEsExitCode(code), false);
  }
});

test("ES exit errors include actionable diagnostics", () => {
  assert.match(createEsExitError(1, "").message, /code 1/);
  assert.match(createEsExitError(6, "Unknown switch").message, /1\.1\.0\.37 or newer/);
  assert.match(createEsExitError(8, "").message, /search client/);
  assert.match(createEsExitError(8, "").message, /not only the Everything Service/);
  assert.match(createEsExitError(8, "").message, /current Windows user session/);
  assert.match(createEsExitError(8, "").message, /same instance/);
});

test("source and bundled servers expose identical tool metadata", async () => {
  const [sourceTools, bundleTools] = await Promise.all([
    listToolsFromServer(path.join(ROOT, "index.js")),
    listToolsFromServer(path.join(ROOT, "bundle", "index.mjs")),
  ]);

  assert.deepEqual(sourceTools, TOOL_DEFINITIONS);
  assert.deepEqual(bundleTools, TOOL_DEFINITIONS);
});

test("bundled tool calls keep the ES option boundary", () => {
  const bundle = fs.readFileSync(path.join(ROOT, "bundle", "index.mjs"), "utf8");
  assert.match(bundle, /"scoop", "apps", "everything-cli", "current", "es\.exe"/);
  assert.match(bundle, /const esArgs = \["-argv"\]/);
  assert.match(bundle, /esArgs\.push\("-path", parentPath\)/);
  assert.match(bundle, /esArgs\.push\("--", query\)/);
  assert.match(bundle, /"--",\s*filename/);
  assert.match(bundle, /if \(!isSuccessfulEsExitCode\(code\)\)/);
});
