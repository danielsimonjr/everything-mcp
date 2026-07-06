# everything skill

Load id: `everything-mcp:everything`. Slash trigger: `/everything`.

Playbook for the `everything-mcp` server — instant, index-backed file search
on Windows via voidtools' Everything engine (`es.exe` under the hood).

## Tools covered

- `search` — file/folder search using Everything syntax (wildcards, boolean,
  extensions, size/date filters, regex, sorting). Queries the live index, so
  results are effectively instant.
- `get_file_info` — size, creation/modified/accessed dates, and attributes
  for a specific path.

## Key gotcha

Everything does **not** index `~\Dropbox` on this machine. A `search` call
over Dropbox paths can miss real files — fall back to a direct filesystem
walk (`Get-ChildItem -Recurse`, or `fzf-mcp`'s `fuzzy_search_files`) instead
of trusting an empty result there.

## See also

`SKILL.md` in this directory for the full playbook, including the
Everything-vs-fzf heuristic (indexed/exact vs fuzzy/tree-walking).
