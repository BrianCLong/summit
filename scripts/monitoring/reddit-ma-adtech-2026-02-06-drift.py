"""
Drift detector for reddit-ma-adtech-2026-02-06.
- Loads baseline report.json
- Regenerates report.current.json from item.yaml (JSON-compatible YAML)
- Emits drift.json with materiality status
Deterministic output: stable key ordering, no timestamps.
"""
from __future__ import annotations

import json
from hashlib import sha256
from pathlib import Path

ITEM_ID = "reddit-ma-adtech-2026-02-06"
REPO_ROOT = Path(__file__).resolve().parents[2]
ITEM_PATH = REPO_ROOT / "intel" / "items" / ITEM_ID / "item.yaml"
ARTIFACT_ROOT = REPO_ROOT / "artifacts" / "intel" / ITEM_ID
BASELINE_ROOT = REPO_ROOT / "intel" / "items" / ITEM_ID / "baseline"


def stable_dump(payload: object, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


def load_item() -> dict:
    raw = ITEM_PATH.read_text(encoding="utf-8")
    return json.loads(raw)


def snippet_hash(url: str, snippet: str) -> str:
    return sha256(f"{url}:{snippet}".encode("utf-8")).hexdigest()


def build_report(item: dict, source_filter: str) -> dict:
    sources = (
        item["sources"]
        if source_filter == "all"
        else [source for source in item["sources"] if source["kind"] == source_filter]
    )

    signals = []
    counter = 1
    for source in sources:
        for claim in source["claims"]:
            signal_id = f"EVI-{item['item_id']}-{counter:03d}"
            counter += 1
            grounding = [
                {
                    "source_kind": source["kind"],
                    "url": evidence["url"],
                    "snippet": evidence["snippet"],
                    "snippet_sha256": snippet_hash(evidence["url"], evidence["snippet"]),
                }
                for evidence in claim["evidence"]
            ]
            signals.append(
                {
                    "signal_id": signal_id,
                    "type": claim["signal_type"],
                    "claim_text": claim["claim_text"],
                    "grounding": grounding,
                    "confidence": "source-asserted",
                }
            )

    signals.sort(key=lambda entry: entry["signal_id"])

    return {
        "item_id": item["item_id"],
        "source": source_filter,
        "published_at": item["published_at"],
        "entities": item["entities"],
        "signals": signals,
    }


def main() -> int:
    drift_path = ARTIFACT_ROOT / "drift.json"
    current_path = ARTIFACT_ROOT / "report.current.json"
    baseline_path = BASELINE_ROOT / "report.json"

    if not baseline_path.exists():
        stable_dump(
            {
                "status": "no_baseline",
                "material": True,
                "baseline_path": str(baseline_path),
            },
            drift_path,
        )
        return 2

    item = load_item()
    current_report = build_report(item, "all")
    stable_dump(current_report, current_path)

    baseline_report = json.loads(baseline_path.read_text(encoding="utf-8"))
    material = baseline_report.get("signals") != current_report.get("signals")

    stable_dump(
        {
            "status": "ok",
            "material": material,
            "baseline_path": str(baseline_path),
            "current_path": str(current_path),
            "diff_hint": "signals_changed" if material else "none",
        },
        drift_path,
    )

    return 1 if material else 0


if __name__ == "__main__":
    raise SystemExit(main())
