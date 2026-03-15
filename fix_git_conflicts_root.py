import os
import re

def fix_git_conflicts(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        if "<<<<<<< HEAD" in content:
            print(f"Fixing {filepath}")
            # we need to remove the conflict markers. Since we don't know exactly what they look like in each file,
            # let's try a simple regex to take HEAD
            fixed_content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [^\n]*\n', r'\1\n', content, flags=re.DOTALL)
            if fixed_content == content:
                # maybe no newline after >>>>>>>
                fixed_content = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [^\n]*', r'\1\n', content, flags=re.DOTALL)

            with open(filepath, 'w') as f:
                f.write(fixed_content)

    except Exception as e:
        print(f"Error processing {filepath}: {e}")

fix_git_conflicts('package.json')
