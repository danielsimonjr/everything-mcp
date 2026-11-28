/**
 * Proves the committed plugin bundle equals a fresh build.
 *
 * The build command is read from package.json "scripts.build", so the build has one
 * definition. The script runs that command with --outfile pointed at a temporary folder,
 * then compares the bytes with the committed file that the same --outfile names.
 *
 * Exit codes:
 *   0  the fresh build equals the committed file
 *   1  the bytes differ (the first differing byte is printed)
 *   2  the check could not run (missing config, failed build, unreadable file)
 *
 * The script writes nothing into the working tree. Its temporary folder is removed in
 * every outcome.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const root = join(import.meta.dir, "..");
const OUTFILE_FLAG = /^--outfile=(.+)$/;

interface Outcome {
  code: 0 | 1 | 2;
  message: string[];
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Reads the build command and returns its argv (without the leading "bun") and the committed outfile. */
function readBuildCommand(): { args: string[]; outfileIndex: number; committed: string } {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts?: Record<string, unknown>;
  };
  const build = pkg.scripts?.build;
  if (typeof build !== "string") {
    throw new Error('package.json has no "scripts.build" string');
  }
  const tokens = build.trim().split(/\s+/);
  if (tokens[0] !== "bun") {
    throw new Error(`scripts.build must start with "bun", found "${tokens[0] ?? ""}"`);
  }
  const args = tokens.slice(1);
  const outfileIndex = args.findIndex((arg) => OUTFILE_FLAG.test(arg));
  if (outfileIndex < 0) {
    throw new Error('scripts.build has no "--outfile=<path>" argument');
  }
  const committed = OUTFILE_FLAG.exec(args[outfileIndex] ?? "")?.[1];
  if (!committed) {
    throw new Error('scripts.build has an empty "--outfile=" argument');
  }
  return { args, outfileIndex, committed };
}

function check(): Outcome {
  let build: ReturnType<typeof readBuildCommand>;
  try {
    build = readBuildCommand();
  } catch (error) {
    return { code: 2, message: [`bundle content check: cannot read the build command: ${(error as Error).message}`] };
  }

  const tempDir = mkdtempSync(join(tmpdir(), "bundle-check-"));
  try {
    const freshPath = join(tempDir, "index.js");
    const args = [...build.args];
    args[build.outfileIndex] = `--outfile=${freshPath}`;

    const run = spawnSync(process.execPath, args, { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
    if (run.status !== 0) {
      return { code: 2, message: [`bundle content check: the build failed (exit ${run.status ?? "signal " + run.signal})`] };
    }

    const name = relative(root, join(root, build.committed)).replaceAll("\\", "/");
    let committed: Buffer;
    let fresh: Buffer;
    try {
      committed = readFileSync(join(root, build.committed));
      fresh = readFileSync(freshPath);
    } catch (error) {
      return { code: 2, message: [`bundle content check: cannot read ${name}: ${(error as Error).message}`] };
    }

    const header = [`committed ${name}  sha256 ${sha256(committed)}  ${committed.length} bytes`, `fresh build        sha256 ${sha256(fresh)}  ${fresh.length} bytes`];
    if (committed.equals(fresh)) {
      return { code: 0, message: [...header, "bundle content check: OK, the committed bundle equals a fresh build"] };
    }

    const limit = Math.min(committed.length, fresh.length);
    let offset = 0;
    while (offset < limit && committed[offset] === fresh[offset]) {
      offset++;
    }
    const hex = (byte: number | undefined): string => (byte === undefined ? "end of file" : `0x${byte.toString(16).padStart(2, "0")}`);
    return {
      code: 1,
      message: [
        ...header,
        `MISMATCH ${name} first differs at byte offset ${offset}: committed ${hex(committed[offset])}, fresh ${hex(fresh[offset])}`,
        "bundle content check: FAILED, rebuild with `bun run build` and commit the result",
      ],
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const outcome = check();
for (const line of outcome.message) {
  (outcome.code === 0 ? console.log : console.error)(line);
}
process.exitCode = outcome.code;
