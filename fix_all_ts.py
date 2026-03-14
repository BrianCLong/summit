import os
import glob
import re

def fix_package_json(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Look for "typescript": "5.x.x" and replace with "5.9.3"
    # Actually, the error shows either "5.0.0" or "5.3.0"
    new_content = re.sub(r'"typescript":\s*"5\.[0-3]\.0"', '"typescript": "5.9.3"', content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")
        return True
    return False

if __name__ == "__main__":
    count = 0
    for root, dirs, files in os.walk("."):
        if "node_modules" in root:
            continue
        for file in files:
            if file == "package.json":
                path = os.path.join(root, file)
                if fix_package_json(path):
                    count += 1
    print(f"Fixed {count} files.")
