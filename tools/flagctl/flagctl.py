#!/usr/bin/env python3
"""CLI for managing feature flag targets and kill-switches."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from tools.flagctl.simple_yaml import load as load_yaml

TARGET_DIR = ROOT / "flags" / "targets"
CATALOG = ROOT / "flags" / "catalog.yaml"
AUDIT_LOG = ROOT / "tools" / "flagctl" / "audit.log"


def load_catalog() -> dict[str, Any]:
    if not CATALOG.exists():
        return {}
    data = load_yaml(CATALOG.read_text()) or {}
    catalog = (
        {item["key"]: item for item in data.get("flags", [])}
        if isinstance(data.get("flags"), list)
        else {}
    )
    return catalog


def load_targets(env: str) -> dict[str, Any]:
    path = TARGET_DIR / f"{env}.yaml"
    if not path.exists():
        return {"environment": env, "flags": {}}
    return load_yaml(path.read_text()) or {"environment": env, "flags": {}}


def save_targets(env: str, payload: dict[str, Any]) -> None:
    path = TARGET_DIR / f"{env}.yaml"
    path.parent.mkdir(parents=True, exist_ok=True)
    # Simple serializer: best-effort JSON for auditability
    path.write_text(json.dumps(payload, indent=2))


def write_audit(event: dict[str, Any]) -> None:
    AUDIT_LOG.parent.mkdir(parents=True, exist_ok=True)
    with AUDIT_LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(event) + "\n")


def get_flag(env: str, key: str) -> None:
    payload = load_targets(env)
    flag = payload.get("flags", {}).get(key)
    print(json.dumps({"env": env, "key": key, "value": flag}, indent=2))


def set_flag(
    env: str, key: str, value: str, percent: int | None, tenants: list[str] | None
) -> None:
    payload = load_targets(env)
    payload.setdefault("flags", {})
    entry = payload["flags"].get(key, {})
    entry["value"] = value.lower() in {"true", "on", "1", "yes"}
    if percent is not None:
        entry["percentage"] = percent
    if tenants is not None:
        entry.setdefault("tenants", {})
        entry["tenants"]["allow"] = tenants
    payload["flags"][key] = entry
    save_targets(env, payload)
    write_audit(
        {
            "trace_id": str(uuid.uuid4()),
            "action": "set",
            "env": env,
            "key": key,
            "value": entry,
            "actor": os.environ.get("GITHUB_ACTOR", os.environ.get("USER", "unknown")),
            "reason": os.environ.get("FLAG_REASON", "manual"),
            "at": dt.datetime.utcnow().isoformat() + "Z",
        }
    )
    print(f"updated {key} in {env}")


def kill_flag(env: str, key: str, reason: str) -> None:
    payload = load_targets(env)
    payload.setdefault("flags", {})
    entry = payload["flags"].get(key, {})
    entry["kill"] = True
    entry["value"] = False
    entry["percentage"] = 0
    payload["flags"][key] = entry
    save_targets(env, payload)
    write_audit(
        {
            "trace_id": str(uuid.uuid4()),
            "action": "kill",
            "env": env,
            "key": key,
            "actor": os.environ.get("GITHUB_ACTOR", os.environ.get("USER", "unknown")),
            "reason": reason,
            "at": dt.datetime.utcnow().isoformat() + "Z",
        }
    )
    print(f"kill-switch enforced for {key} in {env}")


def lint_catalog() -> int:
    catalog = load_catalog()
    exit_code = 0
    for key, item in catalog.items():
        missing = [
            field for field in ["owner", "expires", "risk", "linked_epic"] if not item.get(field)
        ]
        if missing:
            print(f"catalog entry {key} missing fields: {', '.join(missing)}", file=sys.stderr)
            exit_code = 1
        if not item.get("expires") and not item.get("expiry_justification"):
            print(f"catalog entry {key} missing expiry or justification", file=sys.stderr)
            exit_code = 1
    return exit_code


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="flagctl", description="Feature flag management tool")
    sub = parser.add_subparsers(dest="command", required=True)

    p_get = sub.add_parser("get", help="Read flag value")
    p_get.add_argument("key")
    p_get.add_argument("--env", default=os.environ.get("FLAG_ENV", "dev"))

    p_set = sub.add_parser("set", help="Set flag value and rollout")
    p_set.add_argument("key")
    p_set.add_argument("--env", default=os.environ.get("FLAG_ENV", "dev"))
    p_set.add_argument("--value", default="on")
    p_set.add_argument("--percent", type=int)
    p_set.add_argument("--tenants", type=str, help="comma separated allow list")

    p_kill = sub.add_parser("kill", help="Apply kill switch")
    p_kill.add_argument("key")
    p_kill.add_argument("--env", default=os.environ.get("FLAG_ENV", "dev"))
    p_kill.add_argument("--reason", required=True)

    sub.add_parser("lint", help="Validate catalog metadata")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "get":
        get_flag(args.env, args.key)
        return 0
    if args.command == "set":
        tenants = args.tenants.split(",") if args.tenants else None
        set_flag(args.env, args.key, args.value, args.percent, tenants)
        return 0
    if args.command == "kill":
        kill_flag(args.env, args.key, args.reason)
        return 0
    if args.command == "lint":
        return lint_catalog()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
