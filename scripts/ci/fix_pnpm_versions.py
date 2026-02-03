import os
import re

def clean_pnpm_setup(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    new_lines = []
    skip_mode = False
    indentation = ""

    i = 0
    while i < len(lines):
        line = lines[i]

        # Check for pnpm/action-setup
        if "uses: pnpm/action-setup" in line:
            new_lines.append(line)
            i += 1

            # Look ahead for 'with:' block
            if i < len(lines) and lines[i].strip().startswith("with:"):
                # Check if 'version' is inside this 'with' block
                # We need to capture the indentation of 'with:'
                with_indent = len(lines[i]) - len(lines[i].lstrip())

                # Buffer potential removals
                buffer = [lines[i]]
                j = i + 1
                has_version = False
                has_other_keys = False

                while j < len(lines):
                    next_line = lines[j]
                    next_indent = len(next_line) - len(next_line.lstrip())

                    # If empty line or comment, just add to buffer if indented, or break if not?
                    if not next_line.strip() or next_line.strip().startswith("#"):
                        buffer.append(next_line)
                        j += 1
                        continue

                    # If indentation matches or is deeper than keys inside 'with' (with_indent + 2 usually)
                    if next_indent > with_indent:
                        if next_line.strip().startswith("version:"):
                            has_version = True
                            # Don't add to buffer effectively removing it from potential output
                        else:
                            has_other_keys = True
                            buffer.append(next_line)
                        j += 1
                    else:
                        # Dedented, block ended
                        break

                if has_version:
                    if has_other_keys:
                        # Keep 'with:' and other keys
                        new_lines.extend(buffer)
                    else:
                        # Remove 'with:' and everything in buffer (which was just version)
                        pass
                else:
                    # No version key, keep everything
                    new_lines.extend(buffer)

                i = j
                continue

        new_lines.append(line)
        i += 1

    with open(filepath, 'w') as f:
        f.writelines(new_lines)

workflows_dir = ".github/workflows"
for root, dirs, files in os.walk(workflows_dir):
    for file in files:
        if file.endswith(".yml") or file.endswith(".yaml"):
            clean_pnpm_setup(os.path.join(root, file))
