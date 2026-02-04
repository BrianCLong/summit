#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <providers.yaml>" >&2
  exit 2
fi

providers_file="$1"
if [[ ! -f "$providers_file" ]]; then
  echo "ERROR: providers file not found: $providers_file" >&2
  exit 1
fi

python - <<'PY'
import json
import os
import re
import subprocess
import sys

providers_path = sys.argv[1]

providers = []
current = None
with open(providers_path, "r", encoding="utf-8") as handle:
    for raw in handle:
        line = raw.rstrip("\n")
        if not line.strip() or line.strip().startswith("#"):
            continue
        if re.match(r"\s*-\s*name:\s*", line):
            name = line.split(":", 1)[1].strip()
            current = {"name": name, "pause_on": []}
            providers.append(current)
            continue
        if current is None:
            continue
        if re.match(r"\s*status_url:\s*", line):
            current["status_url"] = line.split(":", 1)[1].strip()
            continue
        if re.match(r"\s*pause_on:\s*\[", line):
            values = line.split("[", 1)[1].split("]", 1)[0]
            current["pause_on"] = [v.strip() for v in values.split(",") if v.strip()]
            continue

if not providers:
    print("ERROR: no providers found", file=sys.stderr)
    sys.exit(1)

failures = []
for provider in providers:
    status_url = provider.get("status_url")
    if not status_url:
        failures.append((provider["name"], "missing status_url"))
        continue
    try:
        result = subprocess.run(
            ["curl", "-fsSL", status_url],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        failures.append((provider["name"], f"status fetch failed: {exc}"))
        continue

    indicator = "unknown"
    payload = result.stdout
    try:
        data = json.loads(payload)
        status = data.get("status", {})
        if isinstance(status, dict):
            indicator = status.get("indicator") or status.get("status") or indicator
        page = data.get("page", {})
        if isinstance(page, dict) and indicator == "unknown":
            indicator = page.get("status") or indicator
    except json.JSONDecodeError:
        indicator = "unknown"

    indicator = str(indicator).strip().lower()
    pause_on = [p.strip().lower() for p in provider.get("pause_on", [])]
    if indicator in pause_on:
        failures.append((provider["name"], f"status {indicator} matches pause_on"))

if failures:
    for name, reason in failures:
        print(f"ERROR: provider gate failed for {name}: {reason}", file=sys.stderr)
    ok = "false"
else:
    print("OK: provider status gate passed")
    ok = "true"

output_path = os.environ.get("GITHUB_OUTPUT")
if output_path:
    with open(output_path, "a", encoding="utf-8") as handle:
        handle.write(f"ok={ok}\n")

if ok != "true":
    sys.exit(1)
PY
"$providers_file"
