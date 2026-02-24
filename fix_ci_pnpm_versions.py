import os
import re

def fix_pnpm_version_mismatch():
    print("Fixing pnpm version mismatch (removing 'version: 9' where package.json specifies 10)...")
    workflows_dir = ".github/workflows"
    for filename in os.listdir(workflows_dir):
        if not filename.endswith(".yml"):
            continue
        filepath = os.path.join(workflows_dir, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # If pnpm/action-setup is used and specifies version: 9, remove it to let package.json dictate
        if "pnpm/action-setup" in content and "version: 9" in content:
            print(f"Removing explicit pnpm version 9 from {filename}")
            # Regex to remove "version: 9" or "version: '9'"
            # Be careful with indentation
            new_content = re.sub(r'(\s+)version: [\'"]?9[\'"]?\n', '', content)

            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)

def clean_action_setup_inputs():
    print("Cleaning invalid inputs for pnpm/action-setup...")
    # Error: Unexpected input(s) 'node-version', 'cache', valid inputs are ['version', 'dest', 'run_install', 'package_json_file', 'standalone']
    # This means some workflows are passing 'node-version' or 'cache' to pnpm/action-setup, which is wrong.
    # They should be passed to setup-node.

    workflows_dir = ".github/workflows"
    for filename in os.listdir(workflows_dir):
        if not filename.endswith(".yml"):
            continue
        filepath = os.path.join(workflows_dir, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # This regex is tricky blindly. I'll look for the pattern:
        # - uses: pnpm/action-setup
        #   with:
        #     node-version: ...
        #     cache: ...

        # I'll rely on a simpler approach: remove lines matching "node-version:" or "cache:" specifically inside a pnpm/action-setup block.
        # This requires parsing or stateful iteration.

        lines = content.splitlines()
        new_lines = []
        in_pnpm_setup = False
        indent = ""

        for line in lines:
            stripped = line.strip()
            if "uses: pnpm/action-setup" in line:
                in_pnpm_setup = True
                # Determine indentation of the 'uses' key or just assume standard yaml
                # Actually, I need to know when the block ends.
                # A new step usually starts with "- name:" or "- uses:" at the same level.
                # Or "run:".
                indent = line.split("uses:")[0]
            elif in_pnpm_setup:
                # check if we are still in the with block
                # if line starts with key at same indent as 'uses', block ended
                if stripped.startswith("- ") or (line.startswith(indent) and line != indent and not line.strip().startswith("with:") and not line.strip().startswith("#") and not line.startswith(indent + "  ")):
                     # Heuristic: if indentation returns to parent level, we are out.
                     # But 'with:' is indented. keys inside 'with:' are further indented.
                     pass

                # Check for invalid keys
                if "node-version:" in stripped or "cache:" in stripped:
                    # Verify it's not setup-node
                    # Since we are flagged in_pnpm_setup, we assume it's that step.
                    # We need to be careful not to delete these from setup-node.
                    # Reset flag if we see setup-node?
                    pass

        # Since writing a full parser is risky, I will rely on `sed` for the specific "Unexpected input" errors if I can find the files.
        # The logs say: .github/workflows/lint-openapi.yml (implied by job name)
        # And others.
        pass

if __name__ == "__main__":
    fix_pnpm_version_mismatch()
