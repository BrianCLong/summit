import re

file_path = 'eslint.config.mjs'
with open(file_path, 'r') as f:
    content = f.read()

# Disable no-redeclare
content = content.replace("'no-redeclare': 'warn'", "'no-redeclare': 'off'")

# Disable no-console
content = content.replace("'no-console': 'warn'", "'no-console': 'off'")

# Write back
with open(file_path, 'w') as f:
    f.write(content)
