#!/usr/bin/env python3
import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Try to import jsonschema, but provide a simple fallback if not available
try:
    import jsonschema
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def validate_schema(data, schema):
    if HAS_JSONSCHEMA:
        try:
            jsonschema.validate(instance=data, schema=schema)
            return True, []
        except jsonschema.ValidationError as e:
            return False, [str(e)]
    else:
        # Simple fallback validation
        errors = []
        for field in schema.get("required", []):
            if field not in data:
                errors.append(f"Missing required field: {field}")

        props = schema.get("properties", {})
        for key, value in data.items():
            if key in props:
                expected_type = props[key].get("type")
                if expected_type == "string" and not isinstance(value, str):
                    errors.append(f"Field '{key}' should be string, got {type(value).__name__}")
                elif expected_type == "number" and not isinstance(value, (int, float)):
                    errors.append(f"Field '{key}' should be number, got {type(value).__name__}")
                elif expected_type == "array" and not isinstance(value, list):
                    errors.append(f"Field '{key}' should be array, got {type(value).__name__}")
                elif expected_type == "object" and not isinstance(value, dict):
                    errors.append(f"Field '{key}' should be object, got {type(value).__name__}")

                if "minimum" in props[key] and isinstance(value, (int, float)):
                    if value < props[key]["minimum"]:
                        errors.append(f"Field '{key}' value {value} is less than minimum {props[key]['minimum']}")
                if "maximum" in props[key] and isinstance(value, (int, float)):
                    if value > props[key]["maximum"]:
                        errors.append(f"Field '{key}' value {value} is greater than maximum {props[key]['maximum']}")

                if "pattern" in props[key] and isinstance(value, str):
                    if not re.match(props[key]["pattern"], value):
                        errors.append(f"Field '{key}' value '{value}' does not match pattern {props[key]['pattern']}")

        return len(errors) == 0, errors

class EvidenceValidator:
    def __init__(self, evidence_dir, schema_path):
        self.evidence_dir = Path(evidence_dir)
        self.schema = load_json(schema_path)
        self.results = []
        self.evidence_map = {} # id -> path
        self.evidence_data = {} # id -> data

    def collect_evidence(self):
        # Walk through evidence directory and find all report.json files
        for root, dirs, files in os.walk(self.evidence_dir):
            if 'report.json' in files:
                report_path = Path(root) / 'report.json'
                try:
                    data = load_json(report_path)
                    ev_id = data.get('evidence_id')
                    if ev_id:
                        self.evidence_map[ev_id] = report_path
                        self.evidence_data[ev_id] = data
                except Exception:
                    # Silently skip malformed JSON during collection
                    pass

    def validate_all(self):
        # Pre-calculate hashes for duplicate detection
        content_hashes = {} # hash -> list of ev_ids
        for ev_id, data in self.evidence_data.items():
            # Simplistic hash of the data content (excluding evidence_id)
            content = dict(data)
            content.pop('evidence_id', None)
            try:
                h = hash(json.dumps(content, sort_keys=True))
                if h not in content_hashes:
                    content_hashes[h] = []
                content_hashes[h].append(ev_id)
            except Exception:
                pass

        for ev_id, data in self.evidence_data.items():
            result = {
                "evidence_id": ev_id,
                "status": "PASS",
                "checks": {
                    "schema_compliance": True,
                    "confidence_bounds": True,
                    "cross_reference": True,
                    "chain_completeness": True,
                    "duplicate_detection": True
                },
                "errors": [],
                "warnings": []
            }

            # 1. Schema Compliance
            ok, errors = validate_schema(data, self.schema)
            if not ok:
                result["checks"]["schema_compliance"] = False
                result["errors"].extend(errors)
                result["status"] = "FAIL"

            # 2. Confidence Bounds Checking
            if "claims" in data and isinstance(data["claims"], list):
                for idx, claim in enumerate(data["claims"]):
                    if isinstance(claim, dict):
                        conf = claim.get("confidence")
                        if conf is not None:
                            if not (0 <= conf <= 1):
                                result["checks"]["confidence_bounds"] = False
                                result["errors"].append(f"Claim {idx} confidence {conf} out of bounds [0, 1]")
                                result["status"] = "FAIL"

            if "confidence" in data:
                conf = data["confidence"]
                if isinstance(conf, (int, float)):
                    if not (0 <= conf <= 1):
                        result["checks"]["confidence_bounds"] = False
                        result["errors"].append(f"Confidence {conf} out of bounds [0, 1]")
                        result["status"] = "FAIL"

            # 3. Cross-reference Integrity
            refs = []
            if "references" in data and isinstance(data["references"], list):
                refs.extend(data["references"])
            if "citations" in data and isinstance(data["citations"], list):
                refs.extend(data["citations"])

            # Also check claims supported_by
            if "claims" in data and isinstance(data["claims"], list):
                for claim in data["claims"]:
                    if isinstance(claim, dict) and "supported_by" in claim and isinstance(claim["supported_by"], list):
                        for source in claim["supported_by"]:
                            if isinstance(source, dict) and "evidence_id" in source:
                                refs.append(source["evidence_id"])

            for ref in refs:
                if ref not in self.evidence_data:
                    result["checks"]["cross_reference"] = False
                    result["errors"].append(f"Broken cross-reference: Cited evidence '{ref}' not found")
                    result["status"] = "FAIL"

            # 4. Evidence Chain Completeness
            if refs:
                for ref in refs:
                    ref_data = self.evidence_data.get(ref)
                    if ref_data:
                        ref_refs = ref_data.get("references", []) + ref_data.get("citations", [])
                        ref_sources = ref_data.get("sources", [])
                        if not ref_refs and not ref_sources:
                            result["checks"]["chain_completeness"] = False
                            result["warnings"].append(f"Evidence chain dead-end: '{ref}' has no further citations or sources")
                            if result["status"] == "PASS":
                                result["status"] = "WARNING"

            # 5. Duplicate Evidence Detection
            content = dict(data)
            content.pop('evidence_id', None)
            try:
                h = hash(json.dumps(content, sort_keys=True))
                if len(content_hashes.get(h, [])) > 1:
                    duplicates = [d for d in content_hashes[h] if d != ev_id]
                    result["checks"]["duplicate_detection"] = False
                    result["warnings"].append(f"Duplicate content detected with: {', '.join(duplicates)}")
                    if result["status"] == "PASS":
                        result["status"] = "WARNING"
            except Exception:
                pass

            self.results.append(result)

    def generate_report(self):
        total_checked = len(self.results)
        total_passed = sum(1 for r in self.results if r["status"] == "PASS")
        total_failed = sum(1 for r in self.results if r["status"] == "FAIL")
        total_warnings = sum(1 for r in self.results if r["status"] == "WARNING")

        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_status": "PASS" if total_failed == 0 else "FAIL",
            "summary": {
                "total_checked": total_checked,
                "total_passed": total_passed,
                "total_failed": total_failed,
                "total_warnings": total_warnings
            },
            "details": self.results
        }
        return report

def main():
    parser = argparse.ArgumentParser(description="Summit Evidence Validator")
    parser.add_argument("--dir", default="evidence", help="Directory containing evidence")
    parser.add_argument("--schema", default="scripts/schemas/summit_evidence.schema.json", help="Path to evidence schema")
    parser.add_argument("--output", default="validation_report.json", help="Output path for the report")

    args = parser.parse_args()

    validator = EvidenceValidator(args.dir, args.schema)
    print(f"Collecting evidence from {args.dir}...")
    validator.collect_evidence()
    print(f"Found {len(validator.evidence_data)} evidence objects.")

    print("Validating...")
    validator.validate_all()

    report = validator.generate_report()

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    print(f"Validation complete. Report written to {args.output}")
    print(f"Summary: {report['summary']['total_passed']}/{report['summary']['total_checked']} passed.")

    if report["overall_status"] == "FAIL":
        sys.exit(1)

if __name__ == "__main__":
    main()
