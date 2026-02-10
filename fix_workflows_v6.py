import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Matching pattern:
    #   if: false ...
    #   runs-on: ...
    #   if: ...
    pattern = r'( +)if: false([^\n]*)\n( +runs-on:[^\n]*\n)\1if: ([^\n]*)'
    replacement = r'\1if: (false\2) && (\4)\n\3'
    
    new_content = re.sub(pattern, replacement, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if file.endswith('.yml'):
            fix_workflow(os.path.join(root, file))
