
import os
import re
from pathlib import Path

WORKFLOWS_DIR = Path(".github/workflows")

def fix_pnpm_versions():
    for workflow_file in WORKFLOWS_DIR.glob("*.yml"):
        content = workflow_file.read_text(encoding="utf-8")
        original_content = content

        # Regex to find pnpm/action-setup and remove the version input
        # Case 1: with: version: "X" (multiline)
        # We look for 'uses: pnpm/action-setup...' then 'with:' then 'version: ...'
        # This is tricky with regex.

        lines = content.splitlines()
        new_lines = []
        skip_next = False

        i = 0
        while i < len(lines):
            line = lines[i]

            # Detect pnpm action usage
            if "uses: pnpm/action-setup" in line:
                # Check next lines for 'with:' and 'version:'
                new_lines.append(line)
                i += 1

                # Peek ahead
                if i < len(lines) and lines[i].strip().startswith("with:"):
                    # Check if it's inline 'with: { ... }' or block
                    if "{" in lines[i]:
                        # Inline case: with: { version: 9 }
                        # Remove version: 9 from the braces
                        replaced = re.sub(r'version:\s*[\'"]?[\d\.]+[\'"]?\s*,?', '', lines[i])
                        # Clean up empty braces or trailing commas
                        replaced = replaced.replace('{  }', '{}').replace('{ }', '{}').replace(', }', ' }')
                        # If became empty 'with: { }' or just 'with:', might need cleanup but usually ok or we can just remove 'with' if empty
                        if replaced.strip() == "with: {}":
                           # skip adding this line
                           pass
                        else:
                           new_lines.append(replaced)
                    else:
                        # Block case
                        new_lines.append(lines[i])
                        i += 1
                        while i < len(lines):
                            curr_indent = len(lines[i]) - len(lines[i].lstrip())
                            if curr_indent <= len(line) - len(line.lstrip()): # Back to parent indent
                                # new_lines.append(lines[i]) # Don't append here, handled by outer loop
                                break

                            if "version:" in lines[i]:
                                # Skip this line
                                pass
                            else:
                                new_lines.append(lines[i])
                            i += 1
                        continue # Continue outer loop
            else:
                new_lines.append(line)
                i += 1

        new_content = "\n".join(new_lines) + "\n"

        if new_content != original_content:
            print(f"Fixing pnpm version in {workflow_file}")
            workflow_file.write_text(new_content, encoding="utf-8")

if __name__ == "__main__":
    fix_pnpm_versions()
