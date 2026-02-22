import re

file_path = 'apps/web/src/graphs/GraphCanvas.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 2. Add State (Retry)
state_definition = "  const [guardTooltip, setGuardTooltip] = useState<{x: number, y: number, content: string} | null>(null)"
if "const [guardTooltip" not in content:
    # Look for the start of the function body
    # We know the first line of body is "  // Use canvas renderer for large graphs"
    # Or "const PERFORMANCE_THRESHOLD"

    target = "// Use canvas renderer for large graphs"
    if target in content:
        content = content.replace(target, state_definition + "\n  " + target)
    else:
        # Fallback: look for "const PERFORMANCE_THRESHOLD"
        target2 = "const PERFORMANCE_THRESHOLD"
        if target2 in content:
            content = content.replace(target2, state_definition + "\n  " + target2)

with open(file_path, 'w') as f:
    f.write(content)
