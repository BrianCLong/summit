import argparse
import hashlib
import json
import os
import sys
from typing import List, Dict, Any

# Make sure we can import summit modules
sys.path.append(os.getcwd())

from summit.narrative.detectors.constraints import ConstraintExtractor
from summit.narrative.detectors.roles import RoleProfile, RoleInversionDetector
from summit.narrative.detectors.style import LegibilityBorrowingStyleDrift
from summit.narrative.detectors.ambiguity import AmbiguitySpikeDetector, PrebunkSlotReadiness
from summit.narrative.events import DetectorEvent

def calculate_file_hash(filepath):
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Remove potential timestamps from metadata."""
    sanitized = {}
    for k, v in metadata.items():
        if "time" in k or "date" in k:
            continue
        sanitized[k] = v
    return sanitized

def main():
    parser = argparse.ArgumentParser(description="Run narrative analysis pipeline")
    parser.add_argument("--input", required=True, help="Input JSON file")
    parser.add_argument("--output-dir", required=True, help="Output directory for artifacts")
    args = parser.parse_args()

    with open(args.input) as f:
        input_content = f.read()
        data = json.loads(input_content)

    os.makedirs(args.output_dir, exist_ok=True)

    events: List[DetectorEvent] = []

    # 1. Constraints
    constraint_extractor = ConstraintExtractor()
    signatures_map = {} # deduplication
    for text in data.get("texts", []):
        sig = constraint_extractor.extract(text, data.get("evidence_ids", []))
        if sig.constraints:
            signatures_map[sig.signature_id] = sig

    signatures = list(signatures_map.values())

    # 2. Roles
    if "history" in data and "role" in data["history"]:
        rh = data["history"]["role"]
        profile = RoleProfile(
            actor_id=data.get("actor_id"),
            originator_count=rh.get("originator", 0),
            amplifier_count=rh.get("amplifier", 0),
            critic_count=rh.get("critic", 0),
            defender_count=rh.get("defender", 0)
        )
        detector = RoleInversionDetector(profiles={data.get("actor_id"): profile})
        # Simulate current action from input (simplified for script)
        current_action = data.get("current_action", "originate")
        current_stance = data.get("current_stance", "critic")

        event = detector.detect(
            data.get("actor_id"),
            current_action,
            current_stance,
            data.get("event_window", {}),
            data.get("evidence_ids", [])
        )
        if event:
            events.append(event)

    # 3. Style
    if "history" in data and "style" in data["history"]:
        style_detector = LegibilityBorrowingStyleDrift()
        for text in data.get("texts", []):
            event = style_detector.detect(
                text,
                data.get("actor_id"),
                data["history"]["style"],
                data.get("evidence_ids", [])
            )
            if event:
                events.append(event)

    # 4. Ambiguity & Readiness
    if "pre_event_texts" in data and "post_event_texts" in data:
        ambiguity_detector = AmbiguitySpikeDetector()
        event = ambiguity_detector.detect(
            data["pre_event_texts"],
            data["post_event_texts"],
            data.get("event_window", {}),
            data.get("evidence_ids", [])
        )
        if event:
            events.append(event)

    # Readiness
    prebunk_detector = PrebunkSlotReadiness()
    readiness_score = prebunk_detector.check_readiness(data.get("texts", []))

    # Generate Artifacts

    # Deterministic ID: Hash of input content
    input_hash = hashlib.sha256(input_content.encode('utf-8')).hexdigest()[:16]
    evidence_id = f"EVD-NARRATIVE-{input_hash}"

    # Report.json
    report = {
        "evidence_id": evidence_id,
        "summary": f"Detected {len(events)} events and {len(signatures)} constraint signatures.",
        "artifacts": ["metrics.json", "stamp.json"],
        "details": {
            "events": [
                {
                    "detector": e.detector,
                    "score": e.score,
                    "metadata": sanitize_metadata(e.metadata)
                } for e in events
            ],
            "signatures": [
                {
                    "id": s.signature_id,
                    "constraints": s.constraints
                } for s in signatures
            ],
            "readiness_score": readiness_score
        }
    }

    report_path = os.path.join(args.output_dir, "report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, sort_keys=True)

    # Metrics.json
    metrics = {
        "evidence_id": evidence_id,
        "metrics": {
            "event_count": len(events),
            "signature_count": len(signatures),
            "max_score": max([e.score for e in events]) if events else 0.0,
            "readiness_score": readiness_score
        }
    }
    metrics_path = os.path.join(args.output_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2, sort_keys=True)

    # Stamp.json (Deterministic)
    report_hash = calculate_file_hash(report_path)
    metrics_hash = calculate_file_hash(metrics_path)

    stamp = {
        "evidence_id": evidence_id,
        "versions": {"narrative_pipeline": "1.0.0"},
        "hashes": {
            "report_json": report_hash,
            "metrics_json": metrics_hash
        }
    }
    stamp_path = os.path.join(args.output_dir, "stamp.json")
    with open(stamp_path, "w") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

    print(f"Analysis complete. Artifacts in {args.output_dir}")

if __name__ == "__main__":
    main()
