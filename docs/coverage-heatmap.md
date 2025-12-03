# Coverage Heatmap Generator

This script discovers Istanbul coverage outputs across the monorepo, aggregates results by service, and produces a Markdown or JSON heatmap to highlight untested areas.

## Usage

```bash
node scripts/generate-coverage-heatmap.mjs \
  --output reports/test-coverage-heatmap.md \
  --limit 15 \
  --roots server,services,packages,apps,ga-graphai,sdk
```

### Options

- `--output <file>`: Path for the generated report (directories are created automatically).
- `--limit <number>`: Maximum prioritized gaps to include.
- `--json`: Emit structured JSON instead of Markdown.
- `--roots <list>`: Comma-separated directories to search for coverage outputs.
- `--quiet`: Silence console output for CI pipelines.
- `-h`, `--help`: Show built-in help text.

### Notes

- The script understands both detailed Istanbul outputs (`coverage-final.json`) and summary outputs (`coverage-summary.json`).
- Only coverage artifacts outside ignored directories (e.g., `node_modules`, build caches) are included in the scan.
- Service names are derived from path anchors (`services/<name>`, `packages/<name>`, `apps/<name>`, `ga-graphai/<name>`, `sdk/<name>`, `server`).
- JSON output contains raw aggregates and ranked gap data to enable dashboards or CI annotations.
