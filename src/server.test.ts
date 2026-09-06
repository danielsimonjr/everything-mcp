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

describe("issue #27 — the three es.exe path scopes", () => {
  // Reported by BradKnowles: a search for .csproj under C:\Users\Brad\Code returned all of
  // C:\Users\Brad. Only `-parent-path` was exposed, and it was described as "Search only
  // within this parent path" -- which reads as "within this path". Verified against the real
  // es.exe: -parent-path searches the PARENT of its argument, -path searches inside it.
  test("all three scopes are accepted and independent", () => {
    const parsed = searchInputSchema.parse({
      query: "*.csproj",
      path: "C:\Users\me\Code",
      parentPath: "C:\Users\me\Code",
      parent: "C:\Users\me\Code",
    });
    expect(parsed.path).toBe("C:\Users\me\Code");
    expect(parsed.parentPath).toBe("C:\Users\me\Code");
    expect(parsed.parent).toBe("C:\Users\me\Code");
  });

  test("every scope stays optional, so existing callers are unaffected", () => {
    const parsed = searchInputSchema.parse({ query: "*.csproj" });
    expect(parsed.path).toBeUndefined();
    expect(parsed.parentPath).toBeUndefined();
    expect(parsed.parent).toBeUndefined();
  });

  test("parentPath's description no longer reads as \"inside this path\"", () => {
    // The description is what the MODEL reads to choose a flag, so it is the fix.
    const shape = searchInputSchema.shape as Record<string, { description?: string }>;
    const desc = shape.parentPath?.description ?? "";
    expect(desc).toContain("PARENT");
    expect(desc).toContain("NOT inside the path itself");
    expect(shape.path?.description ?? "").toContain("INSIDE");
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
