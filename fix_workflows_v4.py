import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Matching:
    #   if: false ...
    #   runs-on: ...
    #   if: ...
    
    # We use non-greedy matching for the middle part and ensure we don't jump across jobs
    pattern = r'( +)if: false([^
]*)
( +runs-on:[^
]*
)\1if: ([^
]*)'
    replacement = r'\1if: (false\2) && (\4)
\3'
    
    new_content = re.sub(pattern, replacement, content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if file.endswith('.yml'):
            fix_workflow(os.path.join(root, file))
