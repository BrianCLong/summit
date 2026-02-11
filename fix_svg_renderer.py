import re

file_path = 'apps/web/src/graphs/SVGGraphRenderer.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# The mess left looks like:
#   // Use canvas renderer for large graphs
# relationships={relationships}
#         layout={layout}
# ...
#       />
#     )
#   }

# I'll construct a regex to match this mess.
# It starts with "// Use canvas renderer" (or maybe newline before it)
# And ends with "}" (the closing brace of the if block)
# But wait, the regex removed the START of the block, leaving the middle/end.
# My previous regex removed `const PERFORMANCE...` up to `entities={entities}` (the first `}`).

# So I need to remove from `// Use canvas` (if present) or `relationships=` until the closing `}`.

# Let's just find the range of lines to delete.
lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if "const PERFORMANCE_THRESHOLD" in line:
        skip = True
    if "CanvasGraphRenderer" in line and not skip: # Safety check
         # Wait, regex removed the component name.
         pass

    # Check for leftover props
    if "relationships={relationships}" in line and "SVGGraphRenderer" not in line: # Be careful not to delete props in definition
        # But definition uses `relationships: Relationship[]`.
        # Usage uses `relationships={relationships}`.
        # So it is usage.
        # But wait, did I inadvertently remove the start of the file?
        # No, the function definition is above.

        # If we see `relationships={relationships}` at the top level of the function body (indentation), it's the leftover.
        # Indentation is 8 spaces in the sed output.
        if line.strip().startswith("relationships={relationships}"):
            skip = True # Should have started skipping earlier.

    # I'll use a simpler heuristic.
    # Find `// Use canvas renderer` line.
    # Find the closing `}` of that block.
    # But the block is broken now.
    pass

# Let's restart from a fresh copy of GraphCanvas.tsx (which is now overwritten by the switch component!).
# Oh no, I overwrote GraphCanvas.tsx with the switch component.
# But I copied it to SVGGraphRenderer.tsx FIRST.
# So SVGGraphRenderer.tsx has the full content (with the broken edit).
# I should try to recover the original content or fix the broken content.

# The broken content has:
# ...
#   const [guardTooltip, setGuardTooltip] = ...
#   // Use canvas renderer for large graphs
# relationships={relationships}
# ...
#   }

# I need to remove from `// Use canvas renderer` down to `}`.
# Let's identify the lines.
clean_lines = []
in_broken_block = False
for line in lines:
    if "const PERFORMANCE_THRESHOLD" in line: # This was removed by regex?
        # The regex matched `const PERFORMANCE_THRESHOLD`.
        # So that line is gone.
        pass

    if "// Use canvas renderer" in line:
        in_broken_block = True
        continue

    if in_broken_block:
        # Check if end of block.
        # The block ends with `  }` (indentation 2).
        if line.strip() == "}":
            in_broken_block = False
            continue
        # Otherwise skip
        continue

    # Also need to check if we are in the leftover props.
    # My regex removed `const ... if ... { return ( <CanvasGraphRenderer entities={entities}`.
    # So `relationships={relationships}` is the first leftover line.
    # But `// Use canvas renderer` might still be there.

    if line.strip().startswith("relationships={relationships}"):
        in_broken_block = True
        continue

    clean_lines.append(line)

# This is risky.
# Let's just Regex match the specific leftover block.
# pattern: relationships=\{relationships\}\s+layout=\{layout\}[\s\S]*?\}\s*
content = "\n".join(clean_lines)

# Or better:
# Find `relationships={relationships}`
# ...
# Find `}`
# Remove.

block_start = content.find("relationships={relationships}")
if block_start != -1:
    # Find the preceding `// Use canvas` if present
    comment_start = content.rfind("// Use canvas", 0, block_start)
    if comment_start != -1:
        start_cut = comment_start
    else:
        start_cut = block_start

    # Find the closing `}`
    # It should be shortly after.
    end_cut = content.find("}", block_start) + 1

    content = content[:start_cut] + content[end_cut:]

with open(file_path, 'w') as f:
    f.write(content)
