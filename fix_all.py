import os
import json
import re

def fix_package_json(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        # 1. Strip all merge conflict markers
        # <<<<<<< HEAD
        # =======
        # >>>>>>> origin/main
        # Keep the content of origin/main

        # A simple state machine to parse and keep the latest block
        lines = content.split('\n')
        out_lines = []
        state = 'normal' # normal, in_head, in_incoming

        for line in lines:
            if line.startswith('<<<<<<<'):
                state = 'in_head'
                continue
            elif line.startswith('======='):
                state = 'in_incoming'
                continue
            elif line.startswith('>>>>>>>'):
                state = 'normal'
                continue

            if state == 'normal':
                out_lines.append(line)
            elif state == 'in_head':
                # Skip HEAD block
                pass
            elif state == 'in_incoming':
                out_lines.append(line)

        # Now fix unquoted keys and string values
        # e.g. typescript: "5.9.3" -> "typescript": "5.9.3"
        # e.g. @types/express: "5.0.1" -> "@types/express": "5.0.1"
        final_lines = []
        for line in out_lines:
            # find pattern:   key: "value" or key: 'value' (where key is not quoted)
            # but avoid matching something already quoted like "key": "value"

            # Match spacing, unquoted key, colon, then the rest
            m = re.match(r'^(\s*)([a-zA-Z0-9_\-\@\/]+)\s*:(.*)$', line)
            if m:
                indent = m.group(1)
                key = m.group(2)
                rest = m.group(3)

                # Check if key is already quoted
                if not key.startswith('"'):
                    line = f'{indent}"{key}":{rest}'

            final_lines.append(line)

        final_content = '\n'.join(final_lines)

        # Verify it parses
        try:
            json.loads(final_content)
            with open(filepath, 'w') as f:
                f.write(final_content)
            print(f"Fixed {filepath}")
        except json.JSONDecodeError as e:
            print(f"Failed to auto-fix {filepath}: {e}")

    except Exception as e:
        print(f"Error processing {filepath}: {e}")

for root, dirs, files in os.walk('packages'):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if 'package.json' in files:
        fix_package_json(os.path.join(root, 'package.json'))
for root, dirs, files in os.walk('apps'):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if 'package.json' in files:
        fix_package_json(os.path.join(root, 'package.json'))
