#!/usr/bin/env python3
"""
RACI Matrix Generator from CODEOWNERS
Generates a RACI (Responsible, Accountable, Consulted, Informed) matrix
from the repository's CODEOWNERS file for PMI governance.
"""

import argparse
import pathlib


def parse_codeowners(codeowners_path: pathlib.Path) -> dict[str, set[str]]:
    """Parse CODEOWNERS file and return mapping of owners to their areas."""
    owners = {}

    if not codeowners_path.exists():
        print(f"Warning: {codeowners_path} not found")
        return owners

    try:
        for line in codeowners_path.read_text().splitlines():
            line = line.strip()

            # Skip comments and empty lines
            if not line or line.startswith("#"):
                continue

            # Split line into parts (pattern + owners)
            parts = line.split()
            if len(parts) < 2:
                continue

            pattern = parts[0]
            handles = parts[1:]

            # Add each owner's pattern to their set
            for handle in handles:
                # Clean up handle (remove @)
                clean_handle = handle.lstrip("@")
                if clean_handle not in owners:
                    owners[clean_handle] = set()
                owners[clean_handle].add(pattern)

    except Exception as e:
        print(f"Error reading {codeowners_path}: {e}")
        return {}

    # Sort patterns for consistency
    return {owner: sorted(patterns) for owner, patterns in owners.items()}


def generate_raci_markdown(owner_mapping: dict[str, list[str]]) -> str:
    """Generate RACI matrix as Markdown."""
    lines = [
        "# RACI Matrix (derived from CODEOWNERS)",
        "",
        "*This matrix shows Responsible (R) and Accountable (A) assignments based on code ownership.*",
        "*For full RACI including Consulted (C) and Informed (I), see project documentation.*",
        "",
        "| Person | Areas (R/A) | Scope |",
        "|--------|-------------|-------|",
    ]

    if not owner_mapping:
        lines.extend(
            [
                "| *No owners found* | Check CODEOWNERS file | N/A |",
                "",
                "⚠️  No CODEOWNERS file found or unable to parse. Consider creating one for better governance.",
            ]
        )
    else:
        for person in sorted(owner_mapping.keys()):
            areas = owner_mapping[person]
            area_list = ", ".join(
                f"`{area}`" for area in areas[:3]
            )  # Limit to first 3 for readability
            if len(areas) > 3:
                area_list += f" (+{len(areas) - 3} more)"

            # Determine scope based on patterns
            scope = "Specific" if any("/" in area for area in areas) else "Broad"
            if any(area == "*" or area.startswith("*") for area in areas):
                scope = "Global"

            lines.append(f"| @{person} | {area_list} | {scope} |")

    lines.extend(
        [
            "",
            "## RACI Legend",
            "- **R (Responsible)**: Does the work to complete the task",
            "- **A (Accountable)**: Ultimately answerable for completion and sign-off",
            "- **C (Consulted)**: Provides input and expertise (two-way communication)",
            "- **I (Informed)**: Kept up-to-date on progress (one-way communication)",
            "",
            "## Notes",
            "- CODEOWNERS primarily defines R/A relationships for code changes",
            "- For project decisions and process changes, refer to pm/stakeholders.md",
            "- Update CODEOWNERS when team responsibilities change",
            "",
            f"*Generated on {pathlib.Path.cwd().name} repository*",
        ]
    )

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate RACI matrix from CODEOWNERS file")
    parser.add_argument(
        "--codeowners",
        "-c",
        type=str,
        default="CODEOWNERS",
        help="Path to CODEOWNERS file (default: CODEOWNERS)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="pm/raci.md",
        help="Output file path (default: pm/raci.md)",
    )
    parser.add_argument("--quiet", "-q", action="store_true", help="Suppress output messages")

    args = parser.parse_args()

    # Resolve paths
    codeowners_path = pathlib.Path(args.codeowners)
    output_path = pathlib.Path(args.output)

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Parse CODEOWNERS
    owner_mapping = parse_codeowners(codeowners_path)

    # Generate RACI markdown
    raci_content = generate_raci_markdown(owner_mapping)

    # Write output
    try:
        output_path.write_text(raci_content)
        if not args.quiet:
            print(f"✅ RACI matrix written to {output_path}")
            print(f"   Found {len(owner_mapping)} code owners")
            if owner_mapping:
                total_patterns = sum(len(patterns) for patterns in owner_mapping.values())
                print(f"   Covering {total_patterns} code ownership patterns")
    except Exception as e:
        print(f"❌ Error writing to {output_path}: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
