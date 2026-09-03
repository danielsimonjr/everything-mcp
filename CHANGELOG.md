# Changelog

All notable changes to this project will be documented in this file.

## 2026-09-03 - CI now exercises the NODE runtime, not just Bun

- Every CI step ran through `bun run` while `setup-node` was installed and never invoked,
  so the production runtime was never exercised. Measured across the workspace: 13 of 14
  sampled repos had this shape.
- Added a Node smoke step that imports the shipped entry (`./index.js`) under Node and fails on a
  throw, a syntax error, or an unresolvable import. A server that self-starts on import
  passes after 5s, because starting without crashing is the signal.
- **Proven failure-capable before adoption**, on librarian-mcp: corrupt artifact -> exit 1;
  missing dependency -> exit 1; good artifact -> exit 0. The missing-dependency case is the
  class that forced six repos to revert during the Bun migration.
- Smoke verified locally against this repo's built artifact before the step was added.

## [Unreleased]

### Added

- **Windows CI leg.** CI ran on `ubuntu-latest` only — but Windows is the *production*
  platform for this MCP server (it runs on the user's Windows box), so CI had never once
  tested the OS the server actually ships on. The `build` job now runs a
  `[ubuntu-latest, windows-latest]` matrix.

## [1.1.0] - 2026-07-06

### Added
- **Companion skill** — `everything` (`everything-mcp:everything`,
  `/everything`), a judgment layer over the 2 tools that steers toward
  `search` for name/pattern lookups and `get_file_info` for details on a
  known path, and flags the `~\Dropbox` index-gap gotcha (fall back to a
  filesystem walk, e.g. `fzf-mcp`'s `fuzzy_search_files`). Ships at
  `skills/everything/SKILL.md`.

### Documentation
- Add CycloneDX SBOM (sbom.json).

## [1.0.1] - 2025-12-09

### Fixed
- Changed default ES_PATH from Scoop to Program Files location (`C:\Program Files\Everything\es.exe`)
- Removed misleading Scoop installation note from README (Scoop package doesn't include es.exe)

### Added
- CLAUDE.md guidance document for Claude Code
- MCP server configuration files (.mcp.json, .claude/settings.local.json)

## [1.0.0] - 2025-12-09

### Added
- Initial release
- `search` tool for file/folder search with Everything syntax
- `get_file_info` tool for file details (size, dates, attributes)
- Support for wildcards, regex, boolean operators, size/date filters
- Configurable ES_PATH via environment variable
