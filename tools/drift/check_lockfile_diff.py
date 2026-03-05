#!/usr/bin/env python3
import json
import math
import pathlib
import subprocess
import sys

# Simple heuristic: compare committed lockfile deps vs freshly resolved list.
# Fail if >2% delta (new, removed, or version-changed), but print granular diff.

ROOT = pathlib.Path(__file__).resolve().parents[2]
THRESHOLD = 0.02

def load_lock(lock):
    p = ROOT / lock
    if not p.exists():
        return {}
    try:
        data = json.loads(p.read_text())
        # npm-style
        if "packages" in data:
            return {k.split("node_modules/")[-1]: v.get("version") for k, v in data["packages"].items() if "node_modules/" in k}
        # pnpm-style
        if "dependencies" in data:
            return data["dependencies"]
    except Exception:
        pass
    return {}

def resolve_current():
    # Prefer pnpm if lock exists, else npm. Fall back to pip freeze for Python.
    try:
        if (ROOT/"pnpm-lock.yaml").exists():
            out = subprocess.check_output(["pnpm","list","--depth=0","--json"], cwd=ROOT)
            pkgs = json.loads(out)[0].get("dependencies",{})
            return {k:v.get("version","") for k,v in pkgs.items()}
    except Exception:
        pass
    try:
        if (ROOT/"package-lock.json").exists():
            out = subprocess.check_output(["npm","ls","--depth=0","--json"], cwd=ROOT)
            pkgs = json.loads(out).get("dependencies",{})
            return {k:v.get("version","") for k,v in pkgs.items()}
    except Exception:
        pass
    # Python fallback
    try:
        out = subprocess.check_output([sys.executable,"-m","pip","freeze"], cwd=ROOT).decode().splitlines()
        pairs = [l.strip().split("==",1) for l in out if "==" in l]
        return {k:v for k,v in pairs}
    except Exception:
        return {}

baseline = load_lock("package-lock.json")
current  = resolve_current()

added = {k:current[k] for k in current.keys()-baseline.keys()}
removed = {k:baseline[k] for k in baseline.keys()-current.keys()}
changed = {k:(baseline[k], current[k]) for k in current.keys() & baseline.keys() if baseline[k]!=current[k]}

total = max(1, len(baseline))
delta = (len(added)+len(removed)+len(changed))/total
print(f"[drift] added={len(added)} removed={len(removed)} changed={len(changed)} total={total} delta={delta:.3%}")
if added:   print("  +", ", ".join(f"{k}@{v}" for k,v in sorted(added.items())))
if removed: print("  -", ", ".join(f"{k}@{v}" for k,v in sorted(removed.items())))
if changed: print("  ~", ", ".join(f"{k}:{a}->{b}" for k,(a,b) in sorted(changed.items())))

if delta > THRESHOLD:
    print(f"::error title=Lockfile drift::Delta {delta:.2%} exceeds threshold {THRESHOLD:.0%}")
    sys.exit(1)
