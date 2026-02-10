
import os

filepath = ".github/workflows/ci.yml"

with open(filepath, "r") as f:
    content = f.read()

lines = content.splitlines()
new_lines = []

pnpm_setup = [
    "      - uses: pnpm/action-setup@v4",
    "        with:",
    "          version: 9.12.0"
]

pnpm_inserted = False

for i, line in enumerate(lines):
    stripped = line.strip()
    indent = line[:len(line) - len(stripped)]

    # Detect job start
    if line.startswith("  ") and not line.startswith("    ") and ":" in line:
        pnpm_inserted = False

    # Insert pnpm setup before setup-node if not present in the job
    if "uses: actions/setup-node" in stripped:
        if not pnpm_inserted:
             # Check if pnpm setup is already immediately before (handling existing correct setup)
             prev_line = lines[i-1].strip() if i > 0 else ""
             if "pnpm/action-setup" not in prev_line:
                for p_line in pnpm_setup:
                    new_lines.append(indent + p_line.lstrip())
                pnpm_inserted = True

    # Update existing pnpm setup version if found
    if "uses: pnpm/action-setup" in stripped:
        pnpm_inserted = True
        # We might want to ensure version is 9.12.0
        # This simple script assumes the structure is standard.
        # Let's just blindly replace the version line if it follows.

    if stripped.startswith("version: 9.12.0.12.0"): # Fix typo seen in file read
         new_lines.append(indent + "version: 9.12.0")
         continue

    new_lines.append(line)

with open(filepath, "w") as f:
    f.write("\n".join(new_lines) + "\n")
