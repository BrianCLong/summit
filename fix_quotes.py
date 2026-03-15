import os
import json
import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # The issue seems to be some trailing commas before } or missing quotes
    # Let's fix missing quotes on properties first:
    new_content = re.sub(r'^\s+([@a-zA-Z0-9_/\.-]+):', r'    "\1":', content, flags=re.MULTILINE)

    # Strip trailing commas
    new_content = re.sub(r',\s*\}', '\n}', new_content)
    new_content = re.sub(r',\s*\]', '\n]', new_content)

    with open(file_path, 'w') as f:
        f.write(new_content)

    try:
        json.loads(new_content)
        print(f"Success {file_path}")
    except json.JSONDecodeError as e:
        print(f"Still failed {file_path}: {e}")

def find_package_jsons(dir_path):
    for root, dirs, files in os.walk(dir_path):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if 'dist' in dirs:
            dirs.remove('dist')
        if '.git' in dirs:
            dirs.remove('.git')
        for file in files:
            if file == 'package.json':
                yield os.path.join(root, file)

if __name__ == '__main__':
    for pkg in find_package_jsons('.'):
        with open(pkg, 'r') as f:
            try:
                json.load(f)
            except:
                fix_file(pkg)
