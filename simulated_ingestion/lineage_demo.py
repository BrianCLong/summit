import argparse
import json
from pathlib import Path
from typing import Any, Iterable

DEFAULT_LOG = Path(__file__).with_name("lineage_events.log")
FALLBACK_LOG = Path(__file__).with_name("example_lineage_log.jsonl")


def load_events(log_path: Path) -> list[dict[str, Any]]:
    if not log_path.exists():
        raise FileNotFoundError(f"Lineage log not found at {log_path}")
    with log_path.open(encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def reconstruct_lineage(output_id: str, events: Iterable[dict[str, Any]]) -> dict[str, Any] | None:
    for event in events:
        if event.get("output", {}).get("id") == output_id:
            return {
                "output": event["output"],
                "inputs": event.get("inputs", []),
                "operator": event.get("operator"),
                "occurred_at": event.get("occurred_at"),
                "transform": event.get("transform"),
            }
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Reconstruct lineage for a given output id.")
    parser.add_argument("output_id", help="Record id to trace back")
    parser.add_argument(
        "--log",
        dest="log_path",
        default=None,
        help="Path to lineage JSONL log (defaults to lineage_events.log or example_lineage_log.jsonl)",
    )
    args = parser.parse_args()

    log_path = Path(args.log_path) if args.log_path else DEFAULT_LOG
    if not log_path.exists():
        log_path = FALLBACK_LOG

    events = load_events(log_path)
    lineage = reconstruct_lineage(args.output_id, events)
    if not lineage:
        print(f"No lineage found for {args.output_id} in {log_path}")
        return

    print("Lineage reconstruction:")
    print(json.dumps(lineage, indent=2))


if __name__ == "__main__":
    main()
