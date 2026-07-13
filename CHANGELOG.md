# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Windows CI leg.** CI ran on `ubuntu-latest` only — but Windows is the *production*
  platform for this MCP server (it runs on Daniel's Windows box), so CI had never once
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
