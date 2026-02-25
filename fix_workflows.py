import os

import yaml


def fix_workflow(filepath):
    with open(filepath) as f:
        content = f.read()

    # Load with round-trip loader if possible to preserve comments?
    # Python yaml usually destroys comments.
    # Since we want to preserve comments, maybe string manipulation is better for simple reordering?
    # But reordering steps reliably with regex is hard.
    # Let's try to detect the pattern and swap.

    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]

        # Detect setup-node block
        if 'uses: actions/setup-node@v4' in line:
            # Check if pnpm/action-setup follows immediately or closely
            # We need to capture the whole block of setup-node
            setup_node_block = [line]
            i += 1
            node_indent = len(line) - len(line.lstrip())

            while i < len(lines):
                next_line = lines[i]
                if not next_line.strip():
                    setup_node_block.append(next_line)
                    i += 1
                    continue
                next_indent = len(next_line) - len(next_line.lstrip())
                if next_indent > node_indent:
                    setup_node_block.append(next_line)
                    i += 1
                else:
                    # End of setup-node block?
                    # Check if it is 'with:' or valid property
                    # If it's a new step (starts with -), break
                    if next_line.strip().startswith('-'):
                        break
                    # If it's 'with:', it belongs to setup-node
                    if next_line.strip().startswith('with:') or next_line.strip().startswith('name:'): # name should be before uses usually, but if it is separate key
                         setup_node_block.append(next_line)
                         i += 1
                    else:
                         # Assume end of block
                         break

            # Now check if the NEXT step is pnpm/action-setup
            if i < len(lines) and 'uses: pnpm/action-setup@v4' in lines[i]:
                pnpm_block = [lines[i]]
                i += 1
                pnpm_indent = len(pnpm_block[0]) - len(pnpm_block[0].lstrip())

                while i < len(lines):
                    next_line = lines[i]
                    if not next_line.strip():
                        pnpm_block.append(next_line)
                        i += 1
                        continue
                    next_indent = len(next_line) - len(next_line.lstrip())
                    if next_indent > pnpm_indent:
                        # Remove 'with: { version: ... }' or 'version: ...'
                        if 'version:' in next_line:
                            # Skip this line (remove version)
                            # But if 'with' is on separate line and empty?
                            # Example: with: { version: 9 } -> remove whole line
                            # Example:
                            # with:
                            #   version: 9
                            # -> remove version line. If with becomes empty?
                            i += 1
                            continue
                        pnpm_block.append(next_line)
                        i += 1
                    else:
                        break

                # Check for inline 'with: { version: ... }'
                # uses: pnpm/action-setup@v4
                # with: { version: 9 } -> this is handled above if indented?
                # But sometimes 'uses: ...' has no children if one-liner?

                # Clean up pnpm block (remove version if inline)
                # Not handling inline regex complexity yet, assuming indented 'with' or block

                # SWAP: Output pnpm block first, then setup-node block
                new_lines.extend(pnpm_block)
                new_lines.extend(setup_node_block)
                continue
            else:
                # No swap needed (or pnpm setup not found immediately after)
                new_lines.extend(setup_node_block)
                continue

        # Also remove 'version: ...' from pnpm/action-setup if found independently
        if 'uses: pnpm/action-setup@v4' in line:
             new_lines.append(line)
             i += 1
             # Check next lines for version
             indent = len(line) - len(line.lstrip())
             while i < len(lines):
                 next_line = lines[i]
                 if not next_line.strip():
                     new_lines.append(next_line)
                     i += 1
                     continue
                 next_indent = len(next_line) - len(next_line.lstrip())
                 if next_indent > indent:
                     if 'version:' in next_line:
                         i += 1
                         continue
                     if 'with:' in next_line and '{ version:' in next_line:
                         # Inline with: { version: 9 }
                         # We might want to remove the whole line if it only has version?
                         # Or verify what's inside.
                         if 'version:' in next_line:
                             i += 1
                             continue
                     new_lines.append(next_line)
                     i += 1
                 else:
                     break
             continue

        new_lines.append(line)
        i += 1

    return '\n'.join(new_lines)

# This naive parser is risky.
# Let's do string replacement with regex for 'version: ...' removal
# And specialized replacement for swapping.
