// Smoke test: does this server actually start and speak MCP?
//
// The repo had no tests at all, which made a package-manager migration unprovable --
// "it installed" is not evidence that anything works. These three checks are the
// minimum that would catch a broken server.
//
// It drives the server as a SUBPROCESS rather than importing it. Importing
// src/index.mjs constructs the Server and connects a StdioServerTransport as a side
// effect of module load, so an in-process import would start a real server attached to
// the test runner's own stdio.
//
// No network: the server talks to Ollama, but starting up and listing tools must not
// require Ollama to be reachable. If a future change makes startup depend on it, this
// test fails, which is the point.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STARTUP_BUDGET_MS = 15_000;

/**
 * Start the server, send `requests`, and resolve once a response for every request id
 * has arrived.
 *
 * Waiting on the RESPONSES rather than on a fixed sleep is deliberate: a timer long
 * enough to be reliable is also long enough to be slow, and one short enough to be
 * quick is a flake waiting for a loaded CI runner. This resolves as soon as the data
 * is there and fails loudly if it never comes.
 */
function talk(requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, "index.js")], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      // Point at a port nothing is listening on. Startup must not depend on Ollama.
      env: { ...process.env, ES_PATH: join(ROOT, "tests", "no-such-es.exe") },
    });

    let stdout = "";
    let stderr = "";
    const seen = new Map();

    const done = (err) => {
      clearTimeout(timer);
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
      err ? reject(err) : resolve({ stdout, stderr, seen });
    };

    const timer = setTimeout(() => done(new Error(
      `server did not answer all ${requests.length} request(s) within ` +
      `${STARTUP_BUDGET_MS}ms.\nstdout so far: ${stdout.slice(0, 400)}\n` +
      `stderr so far: ${stderr.slice(0, 400)}`,
    )), STARTUP_BUDGET_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }  // partial line
        if (msg && msg.id !== undefined) seen.set(msg.id, msg);
      }
      if (requests.every((r) => seen.has(r.id))) done(null);
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", done);
    child.on("exit", (code) => {
      if (!requests.every((r) => seen.has(r.id))) {
        done(new Error(`server exited (code ${code}) before answering. stderr: ${stderr.slice(0, 400)}`));
      }
    });

    for (const req of requests) child.stdin.write(JSON.stringify(req) + "\n");
  });
}

const INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "1" },
  },
};
const LIST = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };

test("initialize returns serverInfo and a protocol version", async () => {
  const { seen } = await talk([INIT]);
  const res = seen.get(1);
  assert.ok(res.result, `initialize returned no result: ${JSON.stringify(res)}`);
  assert.equal(typeof res.result.protocolVersion, "string");
  assert.ok(res.result.serverInfo?.name, "serverInfo.name is missing");
});

test("tools/list returns tools, each with a name and an inputSchema", async () => {
  const { seen } = await talk([INIT, LIST]);
  const tools = seen.get(2)?.result?.tools;
  assert.ok(Array.isArray(tools), `tools/list did not return an array: ${JSON.stringify(seen.get(2))}`);
  assert.ok(tools.length > 0, "a server that advertises no tools is not usable");
  for (const tool of tools) {
    assert.ok(tool.name, `tool without a name: ${JSON.stringify(tool)}`);
    assert.ok(tool.inputSchema, `tool ${tool.name} has no inputSchema`);
  }
});

test("stdout carries ONLY JSON-RPC — logging must not corrupt the protocol stream", async () => {
  const { stdout } = await talk([INIT, LIST]);
  // The real risk this guards is a stray console.log: the source file warns that stdout
  // is the protocol channel and all logging must go to stderr. A single plain-text line
  // makes the client fail to parse the stream, and the failure looks like a broken
  // server rather than a stray log.
  const offenders = stdout
    .split("\n")
    .filter((line) => line.trim())
    .filter((line) => {
      try { JSON.parse(line); return false; } catch { return true; }
    });
  assert.deepEqual(offenders, [], `non-JSON written to stdout: ${JSON.stringify(offenders.slice(0, 3))}`);
});
