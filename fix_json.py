import os
import glob
<<<<<<< Updated upstream

def fix_package_json(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        # Simple replacement
        if '<<<<<<<' in content or '=======' in content or '>>>>>>>' in content:
            print(f"File {filepath} has git conflict markers. Deleting them.")

            lines = content.split('\n')
            new_lines = []

            inside_conflict = False

            for line in lines:
                if line.startswith('<<<<<<<'):
                    inside_conflict = True
                    continue
                elif line.startswith('======='):
                    inside_conflict = False
                    continue
                elif line.startswith('>>>>>>>'):
                    inside_conflict = False
                    continue

                if not inside_conflict:
                    new_lines.append(line)

            with open(filepath, 'w') as f:
                f.write('\n'.join(new_lines))
    except Exception as e:
        pass
=======
import re

def fix_package_json(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # If it's valid JSON, we're good
    if '<<<<<<<' not in content and '=======' not in content and '>>>>>>>' not in content:
        return

    # We will try to parse it with node
    print(f"File {filepath} has conflict markers, please fix manually or check out an older version.")
>>>>>>> Stashed changes

if __name__ == "__main__":
    for filepath in glob.glob('**/package.json', recursive=True):
        if "node_modules" not in filepath:
            fix_package_json(filepath)
