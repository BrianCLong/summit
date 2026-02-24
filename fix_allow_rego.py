import os
import re

filepath = "policies/intelgraph/abac/allow.rego"

if os.path.exists(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove specific imports
    new_content = re.sub(r'import future\.keywords\.[a-z]+\n?', '', content)

    if new_content != content:
        # Find package declaration to insert after
        package_match = re.search(r'^package\s+[^\s]+', new_content, re.MULTILINE)
        if package_match:
            end_pos = package_match.end()
            # Insert general import
            new_content = new_content[:end_pos] + "\n\nimport future.keywords" + new_content[end_pos:]

            # Clean up potential double newlines
            new_content = re.sub(r'\n\n\n+', '\n\n', new_content)

            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
        else:
             print(f"Skipping {filepath} (no package declaration found)")
    else:
        print(f"Skipping {filepath} (no specific imports found)")
else:
    print(f"Skipping {filepath} (not found)")
