import { describe, expect, test } from "bun:test";
import { buildSearchArgs, searchInputSchema } from "./server";

/** Parse a tool input the way the MCP SDK does, so the schema defaults apply. */
function argsFor(input: Record<string, unknown>): string[] {
  return buildSearchArgs(searchInputSchema.parse(input));
}

describe("query terms reach es.exe as separate arguments", () => {
  // es.exe reads one argument that contains a space as an exact phrase. A query such as
  // "TODO.md size:>1mb" therefore matched nothing. Each unquoted term must be its own argument.
  test("size: combined with a term", () => {
    expect(argsFor({ query: "TODO.md size:>1mb" }).slice(-2)).toEqual([
      "TODO.md",
      "size:>1mb",
    ]);
  });

  test("dm: combined with a term", () => {
    expect(argsFor({ query: "dm:today TODO.md" }).slice(-2)).toEqual([
      "dm:today",
      "TODO.md",
    ]);
  });

  test("ext: combined with a term", () => {
    expect(argsFor({ query: "ext:md Deep" }).slice(-2)).toEqual(["ext:md", "Deep"]);
  });

  test("a quoted group stays one argument, without its quote characters", () => {
    expect(argsFor({ query: 'ext:md "Deep Learning"' }).slice(-2)).toEqual([
      "ext:md",
      "Deep Learning",
    ]);
  });

  test("an unbalanced quote is refused", () => {
    expect(() => argsFor({ query: '"Deep Learning' })).toThrow(/unbalanced/i);
  });
});

describe("a term cannot become an es.exe option", () => {
  // es.exe reads a leading - or / as a switch. A query of `-help` printed the es.exe help text.
  test("a term that starts with - is refused", () => {
    expect(() => argsFor({ query: "TODO.md -help" })).toThrow(/starts with - or \//);
  });

  test("a term that starts with / is refused", () => {
    expect(() => argsFor({ query: "/ad" })).toThrow(/starts with - or \//);
  });

  test("a quoted term that starts with - is refused after unquoting", () => {
    expect(() => argsFor({ query: '"-help"' })).toThrow(/starts with - or \//);
  });
});

describe("regex mode keeps the pattern as one argument right after -regex", () => {
  // es.exe takes the argument after -regex as the pattern. Placed first, -regex took "-n"
  // as its pattern and every regex search returned nothing.
  test("the pattern follows -regex directly and keeps its space", () => {
    const args = argsFor({ query: "Deep Learning.*pdf", regex: true });
    expect(args.slice(-2)).toEqual(["-regex", "Deep Learning.*pdf"]);
    expect(args.indexOf("-regex")).toBe(args.length - 2);
  });

  test("a regex pattern that starts with - is passed as the pattern", () => {
    expect(argsFor({ query: "-foo.*", regex: true }).slice(-2)).toEqual([
      "-regex",
      "-foo.*",
    ]);
  });
});
