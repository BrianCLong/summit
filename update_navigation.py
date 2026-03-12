import os

filepath = "apps/web/src/components/Navigation.tsx"
with open(filepath, "r") as f:
    content = f.read()

# Import Activity
content = content.replace(
    "  Command,",
    "  Command,\n  Activity,"
)

# Add Nav Item
nav_item = """
  {
    name: 'RAG Health',
    href: '/admin/rag-health',
    icon: Activity as React.ComponentType<{ className?: string }>,
    resource: 'admin',
    action: 'read',
  },"""

# Insert before Admin (which is the last one in navItems usually)
search_str = "  {\n    name: 'Admin',"
if search_str in content:
    content = content.replace(search_str, nav_item + "\n" + search_str)
    print("Added RAG Health to Navigation")
else:
    print("Could not find Admin nav item")

with open(filepath, "w") as f:
    f.write(content)
