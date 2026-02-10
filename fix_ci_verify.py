
import os

filepath = ".github/workflows/ci-verify.yml"

with open(filepath, "r") as f:
    content = f.read()

# Helper to inject pnpm setup before setup-node
# and setup-python before pnpm install
# and update OPA version

lines = content.splitlines()
new_lines = []
in_job = None
job_indent = ""

# Common snippets
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

# Track if we've inserted pnpm setup in the current job
pnpm_inserted = False

for i, line in enumerate(lines):
    stripped = line.strip()
    indent = line[:len(line) - len(stripped)]

    # Detect job start (simplified)
    if line.startswith("  ") and not line.startswith("    ") and ":" in line:
        in_job = line.strip().split(":")[0]
        pnpm_inserted = False

    # Update OPA version
    if "open-policy-agent/setup-opa" in line:
        new_lines.append(line)
        continue
    if stripped.startswith("version: v0.45.0") and "Setup OPA" in lines[i-2]: # context check roughly
        new_lines.append(indent + "version: v0.61.0 # Updated for modern Rego syntax")
        continue

    # Insert pnpm setup before setup-node
    if "uses: actions/setup-node" in stripped:
        # Check if pnpm setup was just before this (legacy/existing)
        # The existing file uses pnpm/action-setup@c5ba... which is a commit hash.
        # We want to standardize.

        # If the previous line was pnpm/action-setup, we might have already processed it or want to replace it.
        # Let's look backward.
        prev_line = lines[i-1].strip()
        if "pnpm/action-setup" in prev_line:
            # We will handle/replace that line when we iterate to it?
            # No, we are at setup-node now.
            pass
        else:
            # If we haven't seen pnpm setup in this job block yet, insert it
            if not pnpm_inserted:
                # Use the same indentation
                for p_line in pnpm_setup:
                    new_lines.append(indent + p_line.lstrip())
                pnpm_inserted = True

    # Replace existing pnpm/action-setup with our standard block if encountered
    if "uses: pnpm/action-setup" in stripped:
        if pnpm_inserted:
            # Already inserted our version, skip this one
            continue
        else:
            # Replace with our version
            for p_line in pnpm_setup:
                new_lines.append(indent + p_line.lstrip())
            pnpm_inserted = True
            continue

    # Insert setup-python before pnpm install
    if stripped == "run: pnpm install --frozen-lockfile":
        # Check if python setup is before
        # We'll just insert it. Idempotency is hard without parsing, but unlikely to have it twice unless we added it.
        # But we know we haven't added it yet.
        for py_line in python_setup:
            new_lines.append(indent + py_line.lstrip())

    new_lines.append(line)

# Post-processing: specific fix for mcp-ux-lint which didn't have pnpm setup
# The loop above adds it before setup-node, so it should be covered.

# Post-processing: specific fix for ga-evidence-completeness which didn't have pnpm install
# We need to find that job and add pnpm install.
final_lines = []
in_ga_job = False
for line in new_lines:
    if "ga-evidence-completeness:" in line:
        in_ga_job = True
    elif line.startswith("  ") and not line.startswith("    ") and ":" in line:
        in_ga_job = False

    final_lines.append(line)

    if in_ga_job and "node-version: \"20\"" in line:
        # After setup-node, add pnpm install
        # We need indentation
        indent = line[:len(line) - len(line.lstrip())]
        # This indent is likely inside `with:`. We need steps indent.
        steps_indent = "      "
        final_lines.append(steps_indent + "- name: Install dependencies")
        final_lines.append(steps_indent + "  run: pnpm install --frozen-lockfile")

# One logic error in the loop: if I replace pnpm setup, I skip the line "uses: ...".
# But if it had "with: version: ...", I need to skip that too.
# Simplified approach: The existing file has `uses: pnpm/action-setup...` as a one-liner usually in this file?
# Let's check the content read.
# The content shows: `uses: pnpm/action-setup@c5ba... # v4` (one liner).
# So skipping just that line is fine.

# Write back
with open(filepath, "w") as f:
    f.write("\n".join(final_lines))
