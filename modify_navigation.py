import re

file_path = 'apps/web/src/components/Navigation.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Update Interface
if "tourId?: string" not in content:
    content = content.replace("badge?: string | number", "badge?: string | number\n  tourId?: string")

# 2. Update Items
updates = [
    ("'Explore'", "tour-explore"),
    ("'Alerts'", "tour-alerts"),
    ("'Data Sources'", "tour-data-sources")
]

for name, tour_id in updates:
    pattern = r"(name: " + name + r",\n\s+href:)"
    replacement = r"\1\n    tourId: '" + tour_id + r"',"
    # Try direct replacement first if regex is tricky with whitespace
    # But whitespace varies.
    # Let's try finding the line with name and appending tourId after it or before it.

    # Actually, simpler approach:
    # name: 'Explore',
    # href: ...
    # Becomes:
    # name: 'Explore',
    # tourId: 'tour-explore',
    # href: ...

    # Using regex
    # Match: name: 'Explore',
    # Replace: name: 'Explore',\n    tourId: 'tour-explore',

    content = re.sub(r"name: " + name + ",", r"name: " + name + ",\n    tourId: '" + tour_id + "',", content)

# 3. Update Component
# Look for <NavLink
# Add id={item.tourId}
# Find: <NavLink
# Replace: <NavLink\n          id={item.tourId}
if "id={item.tourId}" not in content:
    content = content.replace("<NavLink", "<NavLink\n          id={item.tourId}")

with open(file_path, 'w') as f:
    f.write(content)
