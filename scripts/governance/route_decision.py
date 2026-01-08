#!/usr/bin/env python3
"""
Decision Routing Tool
Usage: route_decision.py --type <type> [--domain <domain>]

Types:
  safety     : Safety/Invariant Changes
  entitlement: Entitlement/SKU Changes
  cost       : Cost Baseline Changes
  partner    : Partner Certification
  feature    : Standard Feature
"""

import argparse
import json
import sys

OWNERSHIP_MAP = {
    "capabilities": "@intelgraph/platform-core",
    "policies": "@intelgraph/policy-team",
    "budgets": "@intelgraph/finops-team",
    "invariants": "@intelgraph/security-team",
    "integrations": "@intelgraph/integrations-team",
    "data": "@intelgraph/data-team",
    "observability": "@intelgraph/ops-team",
    "frontend": "@intelgraph/frontend-team",
    "provenance": "@intelgraph/provenance-team",
}

DECISION_RULES = {
    "safety": {
        "approvers": ["@intelgraph/security-team", "Security Lead"],
        "sla": "4 hours",
        "escalation": "CISO",
    },
    "entitlement": {
        "approvers": ["@intelgraph/policy-team", "Product Lead"],
        "sla": "24 hours",
        "escalation": "VP Product",
    },
    "cost": {
        "approvers": ["@intelgraph/finops-team"],
        "sla": "24 hours",
        "escalation": "VP Engineering",
    },
    "partner": {
        "approvers": ["@intelgraph/integrations-team", "Security Lead"],
        "sla": "48 hours",
        "escalation": "VP Business Dev",
    },
    "feature": {"approvers": ["{DRI}"], "sla": "24 hours", "escalation": "Engineering Manager"},
}


def main():
    parser = argparse.ArgumentParser(description="Route decisions to the correct approvers.")
    parser.add_argument(
        "--type", required=True, choices=DECISION_RULES.keys(), help="Type of decision"
    )
    parser.add_argument(
        "--domain", help="Domain key (for feature decisions)", choices=OWNERSHIP_MAP.keys()
    )

    args = parser.parse_args()

    rule = DECISION_RULES[args.type]
    approvers = rule["approvers"]

    if args.type == "feature":
        if not args.domain:
            print("Error: --domain is required for 'feature' type decisions.")
            sys.exit(1)
        dri = OWNERSHIP_MAP.get(args.domain)
        approvers = [dri]

    result = {
        "decision_type": args.type,
        "approvers": approvers,
        "sla": rule["sla"],
        "escalation": rule["escalation"],
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
