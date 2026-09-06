import { describe, expect, test } from "bun:test";
import path from "node:path";
import {
  resolveEsPath,
  resetEsPathCache,
  searchInputSchema,
  getFileInfoInputSchema,
  createServer,
  SERVER_NAME,
  SERVER_VERSION,
} from "../src/server";

describe("resolveEsPath", () => {
  test("rejects a relative ES_PATH", () => {
    expect(() =>
      resolveEsPath({ ES_PATH: "es.exe" } as NodeJS.ProcessEnv),
    ).toThrow(/absolute path/);
  });

  test("returns an absolute ES_PATH when set", () => {
    const abs = path.resolve("/tmp/fake-es.exe");
    expect(resolveEsPath({ ES_PATH: abs } as NodeJS.ProcessEnv)).toBe(abs);
  });

  test("throws when nothing is found", () => {
    expect(() =>
      resolveEsPath({
        ProgramFiles: "/nonexistent-pf",
        "ProgramFiles(x86)": "/nonexistent-pf86",
        LOCALAPPDATA: "/nonexistent-local",
        USERPROFILE: "/nonexistent-home",
      } as NodeJS.ProcessEnv),
    ).toThrow(/es\.exe not found/);
  });
});

describe("schemas", () => {
  test("search requires query and applies defaults", () => {
    const parsed = searchInputSchema.parse({ query: "*.ts" });
    expect(parsed.query).toBe("*.ts");
    expect(parsed.maxResults).toBe(50);
    expect(parsed.regex).toBe(false);
  });

  test("get_file_info requires filename", () => {
    expect(() => getFileInfoInputSchema.parse({})).toThrow();
    expect(getFileInfoInputSchema.parse({ filename: "C:\\\\a.txt" }).filename).toBe(
      "C:\\\\a.txt",
    );
  });
});

describe("createServer", () => {
  test("builds an McpServer instance", () => {
    resetEsPathCache();
    const server = createServer();
    expect(server).toBeDefined();
    expect(SERVER_NAME).toBe("everything-mcp");
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
