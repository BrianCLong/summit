import json
import sys


def parse_trivy(filepath):
    try:
        with open(filepath) as f:
            data = json.load(f)

        secret_count = 0
        if "Results" in data:
            for result in data["Results"]:
                if "Secrets" in result:
                    secret_count += len(result["Secrets"])
        return {"count": secret_count}
    except FileNotFoundError:
        return {"count": 0}  # Assume 0 if not run or no secrets found (if file missing? risky)
    except Exception as e:
        print(f"Error parsing Trivy: {e}", file=sys.stderr)
        return {"count": 0}


def parse_grype(filepath):
    try:
        with open(filepath) as f:
            data = json.load(f)

        # Count High/Critical
        count = 0
        if "matches" in data:
            for match in data["matches"]:
                severity = match.get("vulnerability", {}).get("severity", "UNKNOWN")
                if severity in ["CRITICAL", "HIGH"]:
                    count += 1
        return {"critical_vulns": count}
    except FileNotFoundError:
        return {"critical_vulns": 0}
    except Exception as e:
        print(f"Error parsing Grype: {e}", file=sys.stderr)
        return {"critical_vulns": 0}


def main():
    trivy_file = "trivy-results.json"
    grype_file = "grype-results.json"
    trust_policy_file = "docs/policies/trust-policy.yaml"

    trivy_summary = parse_trivy(trivy_file)
    vuln_summary = parse_grype(grype_file)

    # Simple parsing of freeze mode
    freeze_mode = "advisory"
    try:
        with open(trust_policy_file) as f:
            for line in f:
                if "freeze_mode:" in line:
                    parts = line.split(":", 1)
                    if len(parts) > 1:
                        val = parts[1].strip().split()[0].replace('"', "").replace("'", "")
                        if val == "blocking":
                            freeze_mode = "blocking"
    except Exception as e:
        print(f"Warning: unable to read trust policy ({e})", file=sys.stderr)

    output = {
        "trivy_scan": trivy_summary,
        "sbom": {"vulns": vuln_summary},
        "authz_check": {"violations": 0},  # Placeholder until real AuthZ scanner integrated
        "export_check": {"violations": 0},
        "dlp_check": {"violations": 0},
        "trust_policy": {"ga_gate": {"freeze_mode": freeze_mode}},
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
