import os
import json

def fix_file(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()

    in_conflict = False
    in_incoming = False
    new_lines = []

    for line in lines:
        if line.startswith('<<<<<<< HEAD'):
            in_conflict = True
            in_incoming = False
        elif line.startswith('======='):
            if in_conflict:
                in_incoming = True
            else:
                new_lines.append(line)
        elif line.startswith('>>>>>>>'):
            if in_conflict:
                in_conflict = False
                in_incoming = False
            else:
                new_lines.append(line)
        else:
            if not in_conflict:
                new_lines.append(line)
            elif in_conflict and in_incoming:
                # KEEP INCOMING BLOCK
                new_lines.append(line)

    content = "".join(new_lines)

    import re
    # Strip any trailing commas
    content = re.sub(r',\s*\}', '\n}', content)
    content = re.sub(r',\s*\]', '\n]', content)

    with open(file_path, 'w') as f:
        f.write(content)

    try:
        json.loads(content)
        print(f"Success {file_path}")
    except json.JSONDecodeError as e:
        print(f"Failed {file_path}: {e}")

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
            if '<<<<<<< HEAD' in f.read():
                fix_file(pkg)
