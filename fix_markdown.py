import re
import sys
import glob

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()

        # Simple fix: Add an extra line before lists to satisfy MD032
        content = re.sub(r'([^\n])\n(\s*[-*+] )', r'\1\n\n\2', content)

        with open(filepath, 'w') as f:
            f.write(content)
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    for f in glob.glob('docs/gtm/**/*.md', recursive=True):
        fix_file(f)
