#!/usr/bin/env bash
# IntelGraph Platform - Bench Reporter
# Converts bench JSONL to compact Markdown table matching PR comment format

set -euo pipefail

INPUT="${1:-sprint/benchmark/metrics/*.jsonl}"
OUTPUT="${2:-bench-report.md}"

echo "### Bench Report" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "| target | p95 (ms) | error rate | status |" >> "$OUTPUT"
echo "|---|---:|---:|:--:|" >> "$OUTPUT"

# Process each JSONL file
for file in $INPUT; do
  if [[ -f "$file" ]]; then
    target=$(basename "$file" .jsonl)
    # Get last line and parse JSON
    if last_line=$(tail -n 1 "$file" 2>/dev/null) && [[ -n "$last_line" ]]; then
      p95=$(echo "$last_line" | jq -r '.latency_ms_p95 // "n/a"')
      error_rate=$(echo "$last_line" | jq -r '.error_rate // 0')
      # Simple status based on presence of data
      if [[ "$p95" != "n/a" ]] && [[ "$p95" != "null" ]]; then
        status="✅"
      else
        status="❓"
      fi
      echo "| $target | $p95 | $error_rate | $status |" >> "$OUTPUT"
    fi
  fi
done

echo "" >> "$OUTPUT"
echo "_Generated: $(date -Iseconds)_" >> "$OUTPUT"

echo "📊 Bench report written to $OUTPUT"
cat "$OUTPUT"