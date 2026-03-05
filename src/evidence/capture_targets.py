from __future__ import annotations


def run(args: dict) -> dict:
    return {
        "capture_plan_only": bool(args.get("capture_plan_only", True)),
        "targets": args.get("targets", []),
        "status": "planned",
    }
