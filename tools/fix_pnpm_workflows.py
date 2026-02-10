import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Look for setup-node step
    # We want to insert pnpm setup before it if it's not already there immediately before

    # Simple regex to find the setup-node block start
    # We assume standard indentation of 2 or 4 spaces or more.
    # We'll search for "- uses: actions/setup-node"

    # Note: This is a heuristic.
    if "actions/setup-node" in content:
        # Check if pnpm setup is already there
        if "pnpm/action-setup" not in content:
            print(f"Fixing {filepath}...")
            # Insert before actions/setup-node
            # We assume the indentation of the uses: line is the baseline

            replacement = r"""- uses: pnpm/action-setup@v4
        with:
          version: 9.12.0
      \g<0>"""

            # Using regex substitution to insert before the match
            # Match the indentation and the uses line
            pattern = re.compile(r'(\s+)- uses: actions/setup-node@v[0-9]+')

            # Helper to perform substitution with correct indentation
            def replacer(match):
                indent = match.group(1)
                return f"{indent}- uses: pnpm/action-setup@v4\n{indent}  with:\n{indent}    version: 9.12.0\n{match.group(0)}"

            new_content = pattern.sub(replacer, content)

            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")
            else:
                print(f"Could not safely fix {filepath} with regex")
        else:
            print(f"{filepath} already has pnpm setup (or partial match)")

# Apply to all yaml files in .github/workflows
workflow_dir = ".github/workflows"
for filename in os.listdir(workflow_dir):
    if filename.endswith(".yml") or filename.endswith(".yaml"):
        fix_workflow(os.path.join(workflow_dir, filename))
