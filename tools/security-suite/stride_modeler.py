#!/usr/bin/env python3
"""
STRIDE Threat Model Generator
Analyzes the codebase to generate a preliminary threat model based on STRIDE.
"""

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SERVER_SRC = ROOT / "server" / "src"


def analyze_routes():
    """Finds API endpoints and identifies potential trust boundaries."""
    routes = []
    if not SERVER_SRC.exists():
        return routes

    route_pattern = re.compile(r"(router|app)\.(get|post|put|delete|patch)\(['\"]([^'\"]+)['\"]")

    for root, _, files in os.walk(SERVER_SRC):
        for file in files:
            if file.endswith(".ts") or file.endswith(".js"):
                try:
                    with open(os.path.join(root, file), encoding="utf-8") as f:
                        content = f.read()
                        matches = route_pattern.findall(content)
                        for match in matches:
                            method = match[1].upper()
                            path = match[2]
                            routes.append(
                                {
                                    "file": file,
                                    "method": method,
                                    "path": path,
                                    "auth_check": "ensureAuthenticated" in content
                                    or "passport" in content,
                                    "input_validation": "zod" in content
                                    or "joi" in content
                                    or "body(" in content,
                                }
                            )
                except Exception:
                    pass
    return routes


def analyze_data_stores():
    """Identifies potential data stores based on file names and imports."""
    stores = []
    if not SERVER_SRC.exists():
        return stores

    for root, _, files in os.walk(SERVER_SRC):
        for file in files:
            if file.endswith(".ts") or file.endswith(".js"):
                lower_file = file.lower()
                if (
                    "repo" in lower_file
                    or "dao" in lower_file
                    or "store" in lower_file
                    or "db" in lower_file
                ):
                    with open(os.path.join(root, file), encoding="utf-8") as f:
                        content = f.read()
                        store_type = "Unknown"
                        if "postgres" in content.lower() or "pg" in content.lower():
                            store_type = "PostgreSQL"
                        elif "neo4j" in content.lower():
                            store_type = "Neo4j"
                        elif "redis" in content.lower():
                            store_type = "Redis"

                        stores.append(
                            {
                                "name": file,
                                "type": store_type,
                                "path": os.path.relpath(os.path.join(root, file), ROOT),
                            }
                        )
    return stores


def generate_threats(routes, stores):
    threats = []

    # Analyze Routes
    for route in routes:
        # Spoofing
        if not route["auth_check"]:
            threats.append(
                {
                    "category": "Spoofing",
                    "component": f"{route['method']} {route['path']}",
                    "description": "Endpoint appears to lack authentication middleware.",
                    "mitigation": "Ensure `ensureAuthenticated` or similar middleware is applied.",
                }
            )

        # Tampering
        if not route["input_validation"]:
            threats.append(
                {
                    "category": "Tampering",
                    "component": f"{route['method']} {route['path']}",
                    "description": "Endpoint appears to lack explicit input validation (Zod/Joi).",
                    "mitigation": "Implement strict input validation using Zod schemas.",
                }
            )

    # Analyze Stores
    for store in stores:
        # Information Disclosure
        threats.append(
            {
                "category": "Information Disclosure",
                "component": f"Data Store: {store['name']} ({store['type']})",
                "description": f"Potential for unauthorized access to {store['type']} data.",
                "mitigation": "Verify encryption at rest and transit. Audit access controls.",
            }
        )

        # Denial of Service
        threats.append(
            {
                "category": "Denial of Service",
                "component": f"Data Store: {store['name']} ({store['type']})",
                "description": "Resource exhaustion if queries are not optimized or rate-limited.",
                "mitigation": "Implement connection pooling, timeouts, and query cost limits.",
            }
        )

    return threats


def main():
    print("Analyzing codebase for STRIDE threat modeling...")
    routes = analyze_routes()
    stores = analyze_data_stores()

    threats = generate_threats(routes, stores)

    report_path = ROOT / "docs" / "security" / "THREAT_MODEL_REPORT.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)

    with open(report_path, "w") as f:
        f.write("# Automated STRIDE Threat Model Report\n\n")
        f.write(f"**Generated:** {os.popen('date').read().strip()}\n\n")

        f.write("## Summary\n")
        f.write(f"- **Endpoints Analyzed:** {len(routes)}\n")
        f.write(f"- **Data Stores Identified:** {len(stores)}\n")
        f.write(f"- **Potential Threats Detected:** {len(threats)}\n\n")

        f.write("## Identified Threats\n\n")
        if not threats:
            f.write("No obvious threats detected based on heuristics.\n")

        # Group by Category
        by_category = {}
        for t in threats:
            cat = t["category"]
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(t)

        for cat, items in by_category.items():
            f.write(f"### {cat}\n")
            for item in items:
                f.write(f"- **Component:** `{item['component']}`\n")
                f.write(f"  - **Issue:** {item['description']}\n")
                f.write(f"  - **Mitigation:** {item['mitigation']}\n")
            f.write("\n")

    print(f"Report generated at {report_path}")


if __name__ == "__main__":
    main()
