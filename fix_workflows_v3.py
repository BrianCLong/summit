import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # This regex targets the specific pattern:
    # 1. 'if: false' followed by a comment
    # 2. 'runs-on: ...' (optional, might have indentation)
    # 3. Another 'if: ...' key
    # It replaces it with a single 'if: (false) && (...)'
    
    pattern = r'( +)if: false(.*?)
( +runs-on:.*?
)?\1if: (.*?)
'
    replacement = r'\1if: (false\2) && (\4)
\3'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if file.endswith('.yml'):
            fix_workflow(os.path.join(root, file))
