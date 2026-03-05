from __future__ import annotations


def run(args: dict) -> dict:
    return {
        "mode": args.get("mode", "submit_then_verify"),
        "providers": sorted(args.get("providers", [])),
        "status": "skipped_by_feature_flag",
    }
