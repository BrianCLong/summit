import json

with open('apps/intelgraph-api/package.json', 'r') as f:
    content = f.read()

# Fix unquoted keys in dependencies
import re
fixed_content = re.sub(r'^\s*([@a-zA-Z0-9\-\/]+):\s*"', r'    "\1": "', content, flags=re.MULTILINE)

try:
    json.loads(fixed_content)
    with open('apps/intelgraph-api/package.json', 'w') as f:
        f.write(fixed_content)
    print("Fixed JSON successfully")
except Exception as e:
    print(f"Error: {e}")
