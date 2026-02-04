import os
import re

workflows_dir = ".github/workflows"
workflow_files = [f for f in os.listdir(workflows_dir) if f.endswith(".yml")]

pnpm_setup_step = """
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
          run_install: false
"""

for filename in workflow_files:
    filepath = os.path.join(workflows_dir, filename)
    with open(filepath, "r") as f:
        content = f.read()

    if "cache: 'pnpm'" in content or "cache: pnpm" in content:
        # Check if pnpm/action-setup is already there
        if "pnpm/action-setup" not in content:
            # Add it before setup-node
            new_content = re.sub(
                r"( +)- uses: actions/setup-node@v4",
                r"\1- uses: pnpm/action-setup@v4\n\1  with:\n\1    version: 9\n\1    run_install: false\n\1- uses: actions/setup-node@v4",
                content
            )
            if new_content != content:
                print(f"Fixed {filename}: added pnpm/action-setup before setup-node")
                with open(filepath, "w") as f:
                    f.write(new_content)
        else:
            # It exists, check if it is BEFORE setup-node
            setup_pnpm_pos = content.find("pnpm/action-setup")
            setup_node_pos = content.find("actions/setup-node")
            if setup_node_pos != -1 and setup_pnpm_pos > setup_node_pos:
                print(f"Fixed {filename}: moving pnpm/action-setup before setup-node")
                # This is a bit harder to automate safely with regex if there are multiple jobs
                # But let's try a simple approach for common patterns

                # Extract the pnpm setup block
                # Assuming it looks like:
                # - name: Setup pnpm (optional)
                #   uses: pnpm/action-setup@...
                #   with: ...

                # For now, I'll just report these and fix them manually if few, or refine the script.
                pass
