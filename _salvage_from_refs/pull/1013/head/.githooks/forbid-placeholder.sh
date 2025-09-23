#!/bin/bash
# Fail if placeholder string for duckdb path appears in staged files
if grep -R "\\${input:duckdb_db_path}" "$@" >/dev/null 2>&1; then
  echo "Error: placeholder \\${input:duckdb_db_path} detected. Remove before commit." >&2
  exit 1
fi
exit 0
