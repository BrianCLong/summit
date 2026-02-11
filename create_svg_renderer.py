import re

file_path = 'apps/web/src/graphs/SVGGraphRenderer.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Rename Component
content = content.replace("export function GraphCanvas", "export function SVGGraphRenderer")

# 2. Remove Early Return Logic
# Look for:
#   const PERFORMANCE_THRESHOLD = 500
#   if (entities.length > PERFORMANCE_THRESHOLD) {
#     return (
#       <CanvasGraphRenderer ... />
#     )
#   }
# I will use a regex to remove this block.

pattern = r"\s*const PERFORMANCE_THRESHOLD = 500\s*if \(entities\.length > PERFORMANCE_THRESHOLD\) \{[\s\S]*?\}\s*"
content = re.sub(pattern, "\n", content)

# 3. Remove CanvasGraphRenderer import
# import { CanvasGraphRenderer } from './CanvasGraphRenderer'
import_pattern = r"import \{ CanvasGraphRenderer \} from '\./CanvasGraphRenderer'\s*"
content = re.sub(import_pattern, "", content)

# 4. Remove CanvasGraphRenderer usage (which is inside the removed block, but just in case)
if "CanvasGraphRenderer" in content:
    print("Warning: CanvasGraphRenderer still present!")

with open(file_path, 'w') as f:
    f.write(content)
