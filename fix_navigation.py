import re

file_path = 'apps/web/src/components/Navigation.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Fix the Logo NavLink
# It currently has: <NavLink\n          id={item.tourId} to="/"
bad_pattern = r'<NavLink\n          id=\{item\.tourId\} to="/"'
good_pattern = r'<NavLink to="/"'

content = re.sub(bad_pattern, good_pattern, content)

with open(file_path, 'w') as f:
    f.write(content)
