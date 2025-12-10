# Changelog

All notable changes to this project will be documented in this file.

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
