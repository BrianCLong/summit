import re

file_path = 'apps/web/src/pages/ExplorePage.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Add Import
if "Skeleton" not in content:
    content = content.replace("import { Button } from '@/components/ui/Button'", "import { Button } from '@/components/ui/Button'\nimport { Skeleton } from '@/components/ui/Skeleton'")

# 2. Replace Loading
old_loading = """          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading graph data...</p>
              </div>
            </div>
          ) :"""

new_loading = """          {loading ? (
            <div className="absolute inset-0 p-4">
              <Skeleton className="w-full h-full rounded-xl bg-muted/50" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <span className="sr-only">Loading graph data...</span>
              </div>
            </div>
          ) :"""

if old_loading in content:
    content = content.replace(old_loading, new_loading)
else:
    # Use regex if needed, but exact match is safer if formatting matches.
    # The indentation seems to match the `cat` output earlier.
    # If not, try regex.
    pattern = r"\{loading \? \(\s+<div className=\"absolute inset-0 flex items-center justify-center\">\s+<div className=\"text-center space-y-4\">\s+<div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto\"></div>\s+<p className=\"text-muted-foreground\">Loading graph data...</p>\s+</div>\s+</div>\s+\) :"
    content = re.sub(pattern, new_loading, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)
