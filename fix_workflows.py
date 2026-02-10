import os

def fix_workflow(filepath, job_name=None):
    with open(filepath, "r") as f:
        content = f.read()

    lines = content.splitlines()
    new_lines = []

    pnpm_setup = [
        "      - uses: pnpm/action-setup@v4",
        "        with:",
        "          version: 9.12.0"
    ]

    python_setup = [
        "      - uses: actions/setup-python@v5",
        "        with:",
        "          python-version: '3.11'",
        "          cache: 'pip'"
    ]

    pnpm_inserted = False

    for i, line in enumerate(lines):
        stripped = line.strip()
        indent = line[:len(line) - len(stripped)]

        # Insert pnpm setup before setup-node
        if "uses: actions/setup-node" in stripped:
             if not pnpm_inserted:
                for p_line in pnpm_setup:
                    new_lines.append(indent + p_line.lstrip())
                pnpm_inserted = True

        # Fix missing dependencies in ga-evidence-completeness (specific to ci-verify.yml)
        if job_name == "ga-evidence-completeness" and "node-version: \"20\"" in stripped:
             new_lines.append(line)
             # Check if next line is already pnpm install
             if i + 1 < len(lines) and "pnpm install" not in lines[i+1]:
                 new_lines.append(indent + "- name: Install dependencies")
                 new_lines.append(indent + "  run: pnpm install --frozen-lockfile")
             continue

        new_lines.append(line)

        # Reset pnpm_inserted if job changes (heuristic)
        if line.startswith("  ") and not line.startswith("    ") and ":" in line:
            pnpm_inserted = False

    with open(filepath, "w") as f:
        f.write("\n".join(new_lines) + "\n")

# Apply to known failing files
files_to_fix = [
    ".github/workflows/ci-security.yml",
    ".github/workflows/release-policy-tests.yml"
]

for f in files_to_fix:
    if os.path.exists(f):
        print(f"Fixing {f}...")
        fix_workflow(f)
    else:
        print(f"Skipping {f} (not found)")
