---
name: everything
description: "Playbook for the everything-mcp server: instant, index-backed file lookup on Windows via the Everything engine. Use when the user says 'find the file <name>', 'where is <file>', 'locate files matching <pattern>', 'search for *.ext', or needs a fast exact/glob/regex file-name search across drives. Two tools: search and get_file_info."
---

# Everything

A judgment layer over the `everything-mcp` server's 2 tools — instant, index-backed file/folder lookup on Windows, wrapping voidtools' [Everything](https://www.voidtools.com/) engine via its `es.exe` CLI. This skill adds no tools of its own: every action below is one of the server's existing MCP tools. Its job is to steer you toward `search` for name/pattern lookups, `get_file_info` for details on a known path, and to flag the one gotcha that actually bites on this machine — an index gap for Dropbox.

**Skill root**: this skill ships inside the `everything-mcp` plugin (repo `danielsimonjr/everything-mcp`, `skills/everything/`). Slash trigger: `/everything`.

## The two tools

| Tool | Purpose |
|---|---|
| `search` | Search files/folders by Everything syntax — wildcards (`*.js`), boolean (`file AND doc`, `NOT backup`), extensions (`ext:jpg;png`), size (`size:>1mb`), dates (`dm:today`), path (`path:C:\Users\`, `parent:Downloads`), regex. Instant because it queries Everything's live index, not the filesystem. |
| `get_file_info` | Given a full path or filename, returns size, creation/modified/accessed dates, and attributes. |

Reach for `search` whenever the ask is "find/locate/where is a file matching X" — it's instant across the whole indexed drive set, no directory walk needed. Reach for `get_file_info` once you already have a candidate path and need its details rather than more candidates.

If a tool isn't loaded, fetch its schema first: `ToolSearch select:mcp__plugin_everything-mcp_everything-mcp__search`.

## Gotcha: Everything does NOT index `~\Dropbox` on this machine

Observed on this machine: Everything's index excludes `C:\Users\danie\Dropbox` (the reason for the exclusion wasn't investigated — only the observed behavior). A `search` call scoped to or containing Dropbox paths will silently miss files that exist there. **For any Dropbox-rooted search, don't trust `search` — fall back to a direct filesystem walk** (`Get-ChildItem -Recurse` via PowerShell, or the `fzf-mcp` server's `fuzzy_search_files`) instead of assuming absence from an empty `search` result.

## Everything vs fzf

**Everything** = instant, index-backed, best for exact/glob/regex file-name lookups across indexed drives. **fzf** (`fzf-mcp`, `/fzf` skill) = fuzzy/typo-tolerant matching that walks the filesystem live — slower, but works on paths Everything doesn't index (like Dropbox) and tolerates approximate queries. Default to Everything for a known name or pattern; drop to fzf when the query is fuzzy or the path is one of Everything's blind spots.
