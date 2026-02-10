import os
import re

files_to_update_imports = [
    "policies/agent-archetypes.rego",
    "policies/approval.rego",
    "policies/budget.rego",
    "policies/truth-defense.rego"
]

for filepath in files_to_update_imports:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (not found)")
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    # Replace specific imports with general import
    # Pattern to match: import future.keywords.<something> (one or more lines)
    # and replace with single "import future.keywords"

    # Check if general import already exists (to avoid duplication if run multiple times)
    if "import future.keywords\n" in content and "import future.keywords." not in content:
        print(f"Skipping {filepath} (already updated)")
        continue

    # Regex to find block of specific imports
    # We want to replace all occurrences of `import future.keywords.xyz` with a single `import future.keywords`
    # But we should be careful not to leave duplicates.

    # Strategy: Remove all `import future.keywords.*` lines, and insert `import future.keywords` after package declaration.

    new_content = re.sub(r'import future\.keywords\.[a-z]+\n?', '', content)

    # If we removed something, add the general import
    if new_content != content:
        # Find package declaration to insert after
        package_match = re.search(r'^package\s+[^\s]+', new_content, re.MULTILINE)
        if package_match:
            end_pos = package_match.end()
            new_content = new_content[:end_pos] + "\n\nimport future.keywords" + new_content[end_pos:]

            # Clean up potential double newlines if imports were right after package
            new_content = re.sub(r'\n\n\n+', '\n\n', new_content)

            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
        else:
             print(f"Skipping {filepath} (no package declaration found for insertion)")
    else:
        print(f"Skipping {filepath} (no specific imports found)")
