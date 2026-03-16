import re

with open('scripts/verify_evidence.py', 'r') as f:
    content = f.read()

# Replace the check in verify_evidence.py
new_content = content.replace(
    'if "items" not in index:',
    'if "items" not in index and "mappings" not in index and "evidence" not in index:'
)
new_content = new_content.replace(
    'for file_info in index["items"]:',
    'for file_info in index.get("items", index.get("mappings", index.get("evidence", []))):'
)

with open('scripts/verify_evidence.py', 'w') as f:
    f.write(new_content)
