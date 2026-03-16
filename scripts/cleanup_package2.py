import sys
import re

def fix_json(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Fix missing quotes on keys (naive but might work for package.json deps)
    # Match patterns like:   some-key: "value"  -> "some-key": "value"
    # But only inside the dependencies/devDependencies blocks
    lines = content.split('\n')
    fixed = []

    in_deps = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('"dependencies"'):
            in_deps = True
        elif stripped.startswith('"devDependencies"'):
            in_deps = True
        elif stripped == '}' or stripped == '},':
            in_deps = False

        if in_deps and ':' in line and not stripped.startswith('"') and not stripped.startswith('}'):
            # It's an unquoted key
            key, val = line.split(':', 1)
            # only the key part needs quotes
            indent = key[:len(key) - len(key.lstrip())]
            clean_key = key.strip()
            fixed_line = f'{indent}"{clean_key}":{val}'
            fixed.append(fixed_line)
        else:
            fixed.append(line)

    with open(file_path, 'w') as f:
        f.write('\n'.join(fixed))

if __name__ == '__main__':
    for p in sys.argv[1:]:
        fix_json(p)
