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

**Windows Only** - Everything search engine must be installed:

1. **Download Everything**: https://www.voidtools.com/downloads/
2. **Install Everything** and let it index your drives
3. **Verify es.exe** (command-line interface) is available at: `C:\Program Files\Everything\es.exe`

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
If es.exe is not in your PATH, set the `ES_PATH` environment variable:

```json
{
  "mcpServers": {
    "everything": {
      "command": "npx",
      "args": ["-y", "@danielsimonjr/everything-mcp"],
      "env": {
        "ES_PATH": "C:\\\\Program Files\\\\Everything\\\\es.exe"
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
- `maxResults` (optional): Maximum number of results (default: 50)
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
- `parentPath` (optional): Search only within this parent path

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
  "filename": "C:\\\\Users\\\\username\\\\document.txt"
}
```

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
- **In folder**: `path:C:\\Users\\`
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
  "parentPath": "C:\\\\Users\\\\username\\\\Documents"
}
```

### Example 4: Get File Information

Tell Claude:
```
Get detailed information about C:\\config.json
```

Claude will use:
```json
{
  "filename": "C:\\\\config.json"
}
```

## How It Works

1. **Everything Service**: Everything runs as a Windows service, maintaining a real-time index of all files
2. **es.exe**: Command-line interface to query the Everything database
3. **MCP Server**: Wraps es.exe and provides MCP tools for Claude
4. **Instant Results**: Searches complete in milliseconds, even across millions of files

## Troubleshooting

### Everything Not Found

**Error:** `Failed to execute es.exe`

**Solutions:**
1. Verify Everything is installed: Download from https://www.voidtools.com/
2. Ensure Everything service is running (check system tray)
3. Verify es.exe location:
   - Default: `C:\\Program Files\\Everything\\es.exe`
   - Scoop: `C:\\Users\\<username>\\scoop\\apps\\everything\\current\\es.exe`
4. Set `ES_PATH` environment variable in MCP config

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

**Solution:** Run Everything as administrator or adjust folder permissions

## Development

```bash
# Clone repository
git clone https://github.com/danielsimonjr/everything-mcp.git
cd everything-mcp

# Install dependencies
npm install

# Make executable
chmod +x index.js

# Test locally
node index.js
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

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
