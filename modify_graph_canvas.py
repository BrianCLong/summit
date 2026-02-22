import os

file_path = 'apps/web/src/graphs/GraphCanvas.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Add Import
import_statement = "import { HelpTooltip } from '@/components/HelpTooltip'"
if import_statement not in content:
    content = content.replace("import { cn } from '@/lib/utils'", "import { cn } from '@/lib/utils'\n" + import_statement)

# 2. Add State
state_definition = "  const [guardTooltip, setGuardTooltip] = useState<{x: number, y: number, content: string} | null>(null)"
if "const [guardTooltip" not in content:
    # Find where hooks are defined. Look for useState calls or just after function start.
    # Look for "const [fps, setFps] = useState(0)" which likely exists or similar.
    # Or just after "export function GraphCanvas"
    import re
    match = re.search(r'export function GraphCanvas\(\{.*?\}\) \{', content, re.DOTALL)
    if match:
        insert_pos = match.end()
        content = content[:insert_pos] + "\n" + state_definition + content[insert_pos:]

# 3. Modify click handler
# Look for: node.on('click', (event, d) => {
old_click_handler = """    // Click handler for nodes
    node.on('click', (event, d) => {
      event.stopPropagation()
      onEntitySelect?.(d.entity)
    })"""

new_click_handler = """    // Click handler for nodes
    node.on('click', (event, d) => {
      event.stopPropagation()

      const isMobile = window.innerWidth < 768

      // Guard Logic: restricted nodes logic
      // Assuming 'SYSTEM' type is restricted for demo
      if (d.entity.type === 'SYSTEM' && isMobile) {
          setGuardTooltip({
              x: event.clientX,
              y: event.clientY,
              content: "Tap Pro to edit."
          })
          // Auto hide after 3 seconds
          setTimeout(() => setGuardTooltip(null), 3000)
          return
      }

      onEntitySelect?.(d.entity)
    })"""

if old_click_handler in content:
    content = content.replace(old_click_handler, new_click_handler)
else:
    # Try regex if exact match fails due to whitespace
    import re
    pattern = r"// Click handler for nodes\s+node\.on\('click', \(event, d\) => \{\s+event\.stopPropagation\(\)\s+onEntitySelect\?\. \(d\.entity\)\s+\}\)"
    content = re.sub(pattern, new_click_handler, content)

# 4. Render Tooltip
# Insert before closing </div>
if "{/* Legend */}" in content:
    # Insert after Legend div
    # Look for the closing </div> of the main container.
    # It usually ends with "</div>\n  )\n}"

    tooltip_jsx = """
      {guardTooltip && (
        <div
            className="absolute z-50 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md border animate-in fade-in zoom-in duration-200"
            style={{
                left: guardTooltip.x,
                top: guardTooltip.y - 40, // position above
                transform: 'translateX(-50%)'
            }}
        >
            {guardTooltip.content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
        </div>
      )}

      {/* Inline Help */}
      <div className="absolute top-4 left-4">
         <HelpTooltip
            content={
                <div className="space-y-2">
                    <p className="font-semibold">Graph Interaction</p>
                    <p>• Drag nodes to rearrange.</p>
                    <p>• Zoom/Pan to explore.</p>
                    <p>• Click/Tap for details.</p>
                    <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-muted-foreground">"Coordinated signals; Pro unlocks auto-mitigate."</p>
                    </div>
                </div>
            }
         />
      </div>
    """

    # We want to insert this before the last </div> of the component return.
    # The return statement ends with "</div>\n  )\n}"
    last_div_pos = content.rfind("</div>")
    if last_div_pos != -1:
        # Check if this is indeed the last div of the component return
        # A safer bet is to find the Legend closing div and insert after it.
        # Legend code:
        # <div className="absolute bottom-4 left-4 ...">
        # ...
        # </div>

        # Let's find the Legend block end.
        legend_start = content.find("{/* Legend */}")
        if legend_start != -1:
             # Find the closing div for Legend.
             # It's hard to parse matching braces with simple find.
             # But we know the file structure.
             # The Legend is the last child of the main div.
             # So we can insert before the last </div>

             content = content[:last_div_pos] + tooltip_jsx + content[last_div_pos:]

with open(file_path, 'w') as f:
    f.write(content)
