import argparse
import os
import sys

import yaml


def load_catalog(catalog_path):
    with open(catalog_path) as f:
        return yaml.safe_load(f)


def generate_prometheus_rules(catalog, output_dir):
    groups = {}

    for alert in catalog:
        service = alert.get("service", "general")
        if service not in groups:
            groups[service] = []

        # Construct Prometheus Rule
        rule = {
            "alert": alert["id"],
            "expr": alert["expr"],
            "for": alert["for"],
            "labels": alert.get("labels", {}),
            "annotations": {
                "description": alert["description"],
                "summary": f"{alert['id']} triggered for {service}",
                "runbook_url": alert["runbook"],
                "severity": alert["severity"],
                "slo_ref": alert.get("slo_ref", ""),
                "owner": alert["owner"],
            },
        }

        # Add severity label if not present
        if "severity" not in rule["labels"]:
            rule["labels"]["severity"] = alert["severity"]

        groups[service].append(rule)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for service, rules in groups.items():
        rule_group = {"groups": [{"name": f"{service}-alerts", "rules": rules}]}

        output_file = os.path.join(output_dir, f"{service}.yaml")
        with open(output_file, "w") as f:
            f.write("# GENERATED FILE - DO NOT EDIT\n")
            yaml.dump(rule_group, f, sort_keys=False)
        print(f"Generated {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Alert Sync Tool")
    parser.add_argument("--catalog", required=True, help="Path to alert catalog.yaml")
    parser.add_argument("--output", required=True, help="Output directory for generated rules")

    args = parser.parse_args()

    try:
        catalog = load_catalog(args.catalog)
        generate_prometheus_rules(catalog, args.output)
        print("Alert generation complete.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
