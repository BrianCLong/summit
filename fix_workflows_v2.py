import os
import re

workflows_dir = ".github/workflows"
workflow_files = [f for f in os.listdir(workflows_dir) if f.endswith(".yml")]

def fix_content(content):
    if "cache: 'pnpm'" not in content and "cache: pnpm" not in content:
        return content

    # If it has pnpm/action-setup, make sure it's before setup-node
    if "pnpm/action-setup" in content:
        # Find all jobs
        # This is complex for YAML, but let's try a per-line approach
        lines = content.splitlines()
        new_lines = []
        pnpm_block = []
        in_pnpm_block = False
        setup_node_line_idx = -1

        # This is still hard. Let's try a different way.
        # Find the pnpm/action-setup block and move it.
        # We'll use regex to find the block.

        # Simplified: if we find pnpm/action-setup after setup-node, we'll swap them.
        # But only if they are in the same job.

        # Actually, a better way is to just remove any pnpm/action-setup and re-add it before setup-node.

        # Remove existing pnpm setup blocks (approximate)
        temp_content = re.sub(r" *- name: (Setup pnpm|Install pnpm)\n *uses: pnpm/action-setup@[^\n]+\n( *with:\n( *[^\n]+\n)*)?", "", content)
        temp_content = re.sub(r" *- uses: pnpm/action-setup@[^\n]+\n( *with:\n( *[^\n]+\n)*)?", "", temp_content)

        # Add it back before setup-node
        new_content = re.sub(
            r"( +)- (name: Setup Node\.js\n\1  )?uses: actions/setup-node@v4",
            r"\1- name: Setup pnpm\n\1  uses: pnpm/action-setup@v4\n\1  with:\n\1    version: 9\n\1    run_install: false\n\1- \2uses: actions/setup-node@v4",
            temp_content
        )
        return new_content
    else:
        # Add it before setup-node
        new_content = re.sub(
            r"( +)- (name: Setup Node\.js\n\1  )?uses: actions/setup-node@v4",
            r"\1- name: Setup pnpm\n\1  uses: pnpm/action-setup@v4\n\1  with:\n\1    version: 9\n\1    run_install: false\n\1- \2uses: actions/setup-node@v4",
            content
        )
        return new_content

for filename in workflow_files:
    filepath = os.path.join(workflows_dir, filename)
    with open(filepath, "r") as f:
        content = f.read()

    new_content = fix_content(content)
    if new_content != content:
        print(f"Fixed {filename}")
        with open(filepath, "w") as f:
            f.write(new_content)
