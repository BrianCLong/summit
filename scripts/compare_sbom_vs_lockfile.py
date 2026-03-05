#!/usr/bin/env python3
import argparse
import json
import sys
from xml.etree import ElementTree as ET

"""
SBOM vs Lockfile Comparison Tool
Verifies that all dependencies in the lockfile (provided as JSON)
are present in the CycloneDX SBOM (provided as XML).
"""


def parse_pnpm_list_json(data):
    pkgs = set()
    # pnpm list --json --recursive output is a list of projects
    if isinstance(data, list):
        for project in data:
            for dep_type in ["dependencies", "devDependencies"]:
                deps = project.get(dep_type, {})
                for name, info in deps.items():
                    version = info.get("version")
                    if version:
                        # Normalize version: some pnpm versions include extra info like (react@18.2.0)
                        clean_version = version.split("(")[0]
                        pkgs.add((name.lower(), clean_version))
    return pkgs


def parse_sbom_xml(filepath):
    comps = set()
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()

        # Extract namespace from root tag
        namespace = ""
        if "}" in root.tag:
            namespace = root.tag.split("}")[0].strip("{")

        ns = {"c": namespace} if namespace else {}

        # CycloneDX components are usually under /bom/components/component
        # We search globally for component tags in the correct namespace
        for component in root.findall(".//c:component", ns) if ns else root.findall(".//component"):
            name_node = component.find("c:name", ns) if ns else component.find("name")
            version_node = component.find("c:version", ns) if ns else component.find("version")

            if name_node is not None and version_node is not None:
                name = (name_node.text or "").strip().lower()
                version = (version_node.text or "").strip()
                if name and version:
                    comps.add((name, version))
    except Exception as e:
        print(f"Error parsing SBOM XML: {e}")
        sys.exit(1)
    return comps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sbom", required=True, help="Path to CycloneDX SBOM (XML)")
    ap.add_argument("--lockfile", required=True, help="Path to pnpm list --json output")
    args = ap.parse_args()

    # Load pnpm deps from the exported JSON
    try:
        with open(args.lockfile) as f:
            lock_data = json.load(f)
        lock_pkgs = parse_pnpm_list_json(lock_data)
    except Exception as e:
        print(f"Error reading lockfile JSON: {e}")
        sys.exit(1)

    # Load components from the SBOM XML
    sbom_comps = parse_sbom_xml(args.sbom)

    if not lock_pkgs:
        print("Warning: No packages found in lockfile JSON.")

    if not sbom_comps:
        print("Error: No components found in SBOM XML.")
        sys.exit(1)

    missing = []
    # We only check for existence of name+version pair.
    # Transitive dependencies in SBOM that are not in the top-level lockfile are fine.
    for pkg in sorted(lock_pkgs):
        if pkg not in sbom_comps:
            missing.append(pkg)

    if missing:
        print(f"❌ SBOM drift detected! {len(missing)} packages missing from SBOM:")
        for name, version in missing:
            print(f"  - {name}@{version}")
        sys.exit(1)

    print(
        f"✅ SBOM verification successful. All {len(lock_pkgs)} unique dependencies from lockfile are present in SBOM."
    )


if __name__ == "__main__":
    main()
