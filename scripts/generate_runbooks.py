#!/usr/bin/env python3
import json, os, pathlib, datetime
OUT = os.environ.get("OUT", "docs/runbooks")
SINCE = os.environ.get("SINCE", "")
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)
now = datetime.datetime.utcnow().isoformat()
with open(os.path.join(OUT, f"runbook_{now}.md"), "w") as f:
    f.write(f"# Runbook — generated {now}\n\n")
    f.write("Sources: CI events, Maestro logs, OPA decisions, traces.\n")
    f.write(f"Since: {SINCE}\n")

