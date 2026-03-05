from __future__ import annotations


def run(args: dict) -> dict:
    case_id = args.get("case_id") or "CASE-UNSPECIFIED"
    return {
        "case_id": case_id,
        "media_url": (args.get("media_url") or "").strip(),
        "media_local_path": args.get("media_local_path"),
        "investigator_notes": (args.get("investigator_notes") or "").strip(),
    }
