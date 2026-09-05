/**
 * Live stdio round-trip against the built bundle (or Bun source).
 * Verifies initialize + tools/list without needing es.exe.
 *
 * Usage: bun run scripts/stdio-smoke.ts [command...]
 * Default: bun run src/index.ts
 */

import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const command = args.length ? args[0]! : "bun";
const commandArgs = args.length ? args.slice(1) : ["run", "src/index.ts"];

type JsonRpc = {
  jsonrpc?: string;
  id?: number;
  result?: {
    protocolVersion?: string;
    serverInfo?: { name?: string; version?: string };
    tools?: Array<{ name: string }>;
  };
  error?: { message?: string };
};

function send(child: ReturnType<typeof spawn>, msg: object) {
  child.stdin!.write(JSON.stringify(msg) + "\n");
}

async function main() {
  const child = spawn(command, commandArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  let buffer = "";
  const replies: JsonRpc[] = [];

  child.stderr!.on("data", (d: Buffer) => {
    // progress / banners only
    process.stderr.write(d);
  });

  const gotReply = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out waiting for replies")), 15_000);
    child.stdout!.on("data", (d: Buffer) => {
      buffer += d.toString();
      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const parsed = JSON.parse(line) as JsonRpc;
          replies.push(parsed);
          if (replies.length >= 2) {
            clearTimeout(timer);
            resolve();
          }
        } catch {
          reject(new Error(`non-JSON stdout line: ${line}`));
        }
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (replies.length < 2) {
        clearTimeout(timer);
        reject(new Error(`child exited early with code ${code}`));
      }
    });
  });

  send(child, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "stdio-smoke", version: "0.0.0" },
    },
  });
  send(child, {
    jsonrpc: "2.0",
    method: "notifications/initialized",
  });
  send(child, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });

  await gotReply;
  child.kill();

  const init = replies.find((r) => r.id === 1);
  const list = replies.find((r) => r.id === 2);

  if (!init?.result?.serverInfo) {
    throw new Error(`initialize failed: ${JSON.stringify(init)}`);
  }
  if (init.result.serverInfo.name !== "everything-mcp") {
    throw new Error(`unexpected server name: ${init.result.serverInfo.name}`);
  }
  const names = (list?.result?.tools ?? []).map((t) => t.name).sort();
  if (names.join(",") !== "get_file_info,search") {
    throw new Error(`unexpected tools: ${names.join(",")}`);
  }

  console.error(
    `ok: protocol=${init.result.protocolVersion} version=${init.result.serverInfo.version} tools=${names.join(",")}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
