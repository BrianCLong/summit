import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Matching pattern using character classes for newlines to avoid escaping issues
    # Matches:
    #   if: false ...
    #   runs-on: ...
    #   if: ...
    pattern = r'( +)if: false([^
]*)
( +runs-on:[^
]*
)\1if: ([^
]*)'
    replacement = r'\1if: (false\2) && (\4)
\3'
    
    new_content = re.sub(pattern, replacement, content)
    
    # Also handle the reversed order if it exists (if: then runs-on then if: false)
    pattern2 = r'( +)if: ([^f][^
]*)
( +runs-on:[^
]*
)\1if: false([^
]*)'
    replacement2 = r'\1if: (\2) && (false\4)
\3'
    
    new_content = re.sub(pattern2, replacement2, new_content)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if file.endswith('.yml'):
            fix_workflow(os.path.join(root, file))
