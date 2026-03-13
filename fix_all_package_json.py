import os
import re
import json

def fix_package_json(filepath):
    print(f"Fixing {filepath}")
    with open(filepath, 'r') as f:
        content = f.read()

    while '<<<<<<< HEAD' in content:
        new_content = re.sub(r'<<<<<<< HEAD.*?=======.*?\n(.*?)>>>>>>> origin/main', r'\1', content, flags=re.DOTALL)
        if new_content == content:
            new_content = re.sub(r'<<<<<<< HEAD.*?=======.*?\n(.*?)>>>>>>>.*?\n', r'\1', content, flags=re.DOTALL)

        if new_content == content:
            lines = content.splitlines()
            new_lines = []
            for line in lines:
                if not any(m in line for m in ['<<<<<<<', '=======', '>>>>>>>']):
                    new_lines.append(line)
            content = "\n".join(new_lines)
            break
        content = new_content

    lines = content.splitlines()
    new_lines = []
    for line in lines:
        line = re.sub(r'^(\s+)(?!"|})([@a-zA-Z0-9\-/._]+):', r'\1"\2":', line)

        # Specific fix for typescript@5.0.0 which pnpm says doesn't exist (maybe it was 5.0.4 or 5.3.3?)
        # Let's use 5.3.3 as a safe bet if 5.0.0 is encountered
        line = line.replace('"typescript": "5.0.0"', '"typescript": "5.3.3"')

        new_lines.append(line)

    content = "\n".join(new_lines)

    try:
        data = json.loads(content)
    except Exception as e:
        lines = content.splitlines()
        fixed_lines = []
        for i in range(len(lines)):
            l = lines[i].rstrip()
            if i < len(lines) - 1:
                next_l = lines[i+1].lstrip()
                if l.endswith('"') and next_l.startswith('"') and not l.endswith(','):
                    l += ','
            fixed_lines.append(l)
        content = "\n".join(fixed_lines)

        try:
            data = json.loads(content)
        except Exception as e2:
             print(f"Failed to fix {filepath} even with comma injection: {e2}")
             return

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
    print(f"Successfully fixed {filepath}")

for root, dirs, files in os.walk('.'):
    for file in files:
        if file == 'package.json':
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                c = f.read()
                if '<<<<<<< HEAD' in c or re.search(r'^\s+[@a-zA-Z0-9\-/._]+:', c, re.MULTILINE) or '"typescript": "5.0.0"' in c:
                    fix_package_json(filepath)
