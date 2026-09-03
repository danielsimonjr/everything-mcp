# Everything MCP Server

[![NPM](https://img.shields.io/npm/v/@danielsimonjr/everything-mcp.svg)](https://www.npmjs.com/package/@danielsimonjr/everything-mcp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple.svg)](https://modelcontextprotocol.io)

Model Context Protocol (MCP) server for [Everything](https://www.voidtools.com/), the blazing-fast file search engine for Windows. Enables instant file and folder searching through MCP.

## Features

- **Lightning Fast**: Leverages Everything's instant search capabilities
- **Powerful Search Syntax**: Wildcards, regex, boolean operators, size filters, date filters
- **File Details**: Get comprehensive file information (size, dates, attributes)
- **Flexible Filtering**: Filter by type, size, date, attributes, and more
- **Sorting**: Sort results by name, path, size, extension, or dates

## Prerequisites

**Windows Only** - Everything and its command-line client must be installed:

1. **Download Everything**: https://www.voidtools.com/downloads/
2. **Install Everything** and let it index your drives
3. **Keep the Everything search client running** in the logged-in Windows user session. The
   Windows service alone does not provide the IPC endpoint used by `es.exe`. To start the client
   without opening a search window, run `Everything.exe -startup`.
4. **Install ES 1.1.0.37 or newer** from the
   [official ES releases](https://github.com/voidtools/ES/releases). This minimum version is
   required for safe command-line argument separation.
5. **Verify the IPC connection**:
   ```powershell
   es.exe -timeout 5000 -get-everything-version
   ```

## Installation

### Using NPX (Recommended)
```bash
npx @danielsimonjr/everything-mcp
```

### Global Installation
```bash
npm install -g @danielsimonjr/everything-mcp
```

### From Source
```bash
git clone https://github.com/danielsimonjr/everything-mcp.git
cd everything-mcp
npm install
chmod +x index.js
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

#### Using NPX
```json
{
  "mcpServers": {
    "everything": {
      "command": "npx",
      "args": ["-y", "@danielsimonjr/everything-mcp"]
    }
  }
}
```

#### Using Global Install
```json
{
  "mcpServers": {
    "everything": {
      "command": "everything-mcp"
    }
  }
}
```

#### Custom es.exe Path
If `es.exe` is not in one of the automatically probed install locations, set `ES_PATH` to its
absolute path:

```json
{
  "mcpServers": {
    "everything": {
      "command": "npx",
      "args": ["-y", "@danielsimonjr/everything-mcp"],
      "env": {
        "ES_PATH": "C:\\Program Files\\Everything\\es.exe"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "everything": {
      "command": "npx",
      "args": ["-y", "@danielsimonjr/everything-mcp"]
    }
  }
}
```

## Available Tools

### 1. `search`

Search for files and folders using Everything's powerful search syntax.

**Parameters:**
- `query` (required): Search query using Everything syntax
- `maxResults` (optional): Maximum number of results (default: 50, maximum: 1000)
- `regex` (optional): Use regular expression search (default: false)
- `caseSensitive` (optional): Match case (default: false)
- `wholeWord` (optional): Match whole words only (default: false)
- `matchPath` (optional): Match full path and filename (default: false)
- `foldersOnly` (optional): Return only folders (default: false)
- `filesOnly` (optional): Return only files (default: false)
- `sortBy` (optional): Sort by name, path, size, extension, date-created, date-modified, date-accessed
- `sortDescending` (optional): Sort in descending order (default: false)
- `showSize` (optional): Include file size in results (default: false)
- `showDateModified` (optional): Include date modified in results (default: false)
- `parentPath` (optional): Search only within this absolute Windows path

**Example:**
```json
{
  "query": "*.js",
  "sortBy": "date-modified",
  "sortDescending": true,
  "maxResults": 20
}
```

### 2. `get_file_info`

Get detailed information about a specific file.

**Parameters:**
- `filename` (required): Full path or filename to get information about

**Returns:** File size, creation date, modification date, access date, and attributes

**Example:**
```json
{
  "filename": "C:\\Users\\username\\document.txt"
}
```

## Companion skill

This plugin ships a companion skill, `everything` (`everything-mcp:everything`,
slash trigger `/everything`), at `skills/everything/SKILL.md`. It's a judgment
layer over the 2 tools above — no new tools of its own — that steers you
toward `search` for name/pattern lookups and `get_file_info` for details on a
known path, and flags a machine-specific gotcha: Everything's index excludes
`~\Dropbox`, so Dropbox-rooted searches silently miss files and should fall
back to a filesystem walk (e.g. `fzf-mcp`'s `fuzzy_search_files`) instead.

## Everything Search Syntax

Everything supports powerful search syntax:

### Basic Search
- **Simple text**: `readme`
- **Wildcards**: `*.txt`, `file?.doc`
- **Multiple terms**: `report 2024` (AND is implicit)

### Boolean Operators
- **AND**: `file AND document` or `file document`
- **OR**: `txt OR doc`
- **NOT**: `NOT backup` or `!backup`

### File Extensions
- **Single**: `ext:jpg`
- **Multiple**: `ext:jpg;png;gif`

### Size Filters
- **Exact**: `size:1024kb`
- **Greater than**: `size:>1mb`
- **Less than**: `size:<100kb`
- **Range**: `size:1mb..10mb`

### Date Filters
- **Modified**: `dm:today`, `dm:lastweek`, `dm:2024`
- **Created**: `dc:yesterday`
- **Accessed**: `da:thismonth`

### Attributes
- **Hidden**: `attrib:H`
- **Read-only**: `attrib:R`
- **System**: `attrib:S`
- **Directory**: `attrib:D`

### Path Matching
- **In folder**: `path:C:\Users\`
- **Parent**: `parent:Downloads`

### Advanced
- **Regex**: Enable with `regex: true` parameter
- **Case-sensitive**: Enable with `caseSensitive: true`
- **Whole word**: Enable with `wholeWord: true`

See [Everything Search Syntax](https://www.voidtools.com/support/everything/searching/) for complete reference.

## Usage Examples

### Example 1: Find Recent JavaScript Files

Tell Claude:
```
Use Everything to find all JavaScript files modified in the last week, sorted by date
```

Claude will use:
```json
{
  "query": "*.js dm:lastweek",
  "sortBy": "date-modified",
  "sortDescending": true,
  "maxResults": 50
}
```

### Example 2: Find Large Files

Tell Claude:
```
Find all files larger than 100MB
```

Claude will use:
```json
{
  "query": "size:>100mb",
  "showSize": true,
  "sortBy": "size",
  "sortDescending": true
}
```

### Example 3: Search in Specific Directory

Tell Claude:
```
Find all Python files in my Documents folder
```

Claude will use:
```json
{
  "query": "*.py",
  "parentPath": "C:\\Users\\username\\Documents"
}
```

### Example 4: Get File Information

Tell Claude:
```
Get detailed information about C:\config.json
```

Claude will use:
```json
{
  "filename": "C:\\config.json"
}
```

## How It Works

1. **Everything search client**: Loads the search database and exposes the Everything IPC endpoint in the logged-in user's Windows session
2. **Everything Service (optional but recommended)**: Performs NTFS indexing and USN journal monitoring so the search client does not need administrator privileges; it does not provide the search IPC endpoint by itself
3. **es.exe**: Queries the search client through Everything IPC
4. **MCP Server**: Wraps `es.exe` and exposes read-only MCP tools
5. **Instant Results**: Searches complete in milliseconds, even across millions of files

## Troubleshooting

### Everything Not Found

**Error:** `Failed to execute es.exe`

**Solutions:**
1. Verify Everything is installed: Download from https://www.voidtools.com/
2. Verify `es.exe` is version 1.1.0.37 or newer: `es.exe -version`
3. Verify the `es.exe` location:
   - Default: `C:\Program Files\Everything\es.exe`
   - Scoop: `C:\Users\<username>\scoop\apps\everything-cli\current\es.exe`
4. Set `ES_PATH` environment variable in MCP config

### Everything IPC Unavailable (Exit Code 8)

Exit code 8 means `es.exe` could not find the Everything search client's IPC endpoint.

**Solutions:**
1. Start the search client in the same logged-in Windows user session: `Everything.exe -startup`
2. Wait for the Everything database to finish loading, then retry the query
3. Confirm IPC is enabled in Everything and that you are not using the Lite edition, which does not provide IPC
4. If you use a named Everything instance, ensure `es.exe` connects to that same instance

Running only the Windows **Everything Service** is not sufficient. The service performs indexing;
the search client provides the IPC endpoint.

### No Results Found

**Causes:**
- Query doesn't match any files
- Everything database not fully indexed yet
- Incorrect search syntax

**Solutions:**
- Try a broader search term
- Check Everything GUI to verify files are indexed
- Review search syntax

### Permission Issues

**Issue:** Can't access certain directories

**Solution:** Enable the Everything Service and run the search client as the standard user. Adjust
the indexed folders or their permissions if results are still missing.

## Development

```bash
# Clone repository
git clone https://github.com/danielsimonjr/everything-mcp.git
cd everything-mcp

# Install dependencies
npm install

# Make executable
chmod +x index.js

# Test and validate both entry points
npm test
node --check index.js
node --check bundle/index.mjs
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes in both `index.js` and `bundle/index.mjs`; the bundle is committed and is not generated automatically
4. Run `npm test`, `node --check index.js`, and `node --check bundle/index.mjs`
5. Stage only the files you changed and review the diff
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Everything](https://www.voidtools.com/) by voidtools - The amazing search engine
- [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic

## Links

- **NPM Package:** https://www.npmjs.com/package/@danielsimonjr/everything-mcp
- **GitHub Repository:** https://github.com/danielsimonjr/everything-mcp
- **Everything Search:** https://www.voidtools.com/
- **MCP Documentation:** https://modelcontextprotocol.io

---

**Made with ❤️ for the MCP community**
