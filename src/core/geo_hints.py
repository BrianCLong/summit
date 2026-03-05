from __future__ import annotations

import re


def run(args: dict) -> dict:
    notes = args.get("text_notes") or ""
    hints = {
        "quoted_signage": re.findall(r"'([^']+)'", notes),
        "direction_mentions": sorted(set(re.findall(r"\b(N|NE|E|SE|S|SW|W|NW)\b", notes.upper()))),
        "raw_notes": notes,
        "exif_present": bool(args.get("exif")),
    }
    return hints
