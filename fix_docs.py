import os

files_to_fix = [
    "docs/governance/evidence_budget_policy.md",
    "docs/governance/recommendations_policy.md",
    "docs/governance/prompt_paper_trail.md",
    "docs/governance/narrative-model.md",
    "docs/governance/llm_safety.md",
    "docs/governance/lineage_durability.md",
    "docs/governance/zero_trust_data_blueprint.md",
    "docs/governance/ga-ops-ownership.md",
    "docs/governance/osint_methodology_ga_impact.md"
]

header_template = """Owner: Governance
Last-Reviewed: 2026-02-25
Evidence-IDs: none
Status: active

"""

for filepath in files_to_fix:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()

        # Check if it already has a valid-ish header (starts with Owner:)
        if content.startswith("Owner:"):
            continue

        # Strip existing "header-like" content if it's markdown bold/etc or frontmatter
        lines = content.splitlines()
        new_content = header_template + content

        # Write back
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")
