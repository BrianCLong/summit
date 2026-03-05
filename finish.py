import subprocess

try:
    subprocess.run(["git", "add", "README_status.md"])
    subprocess.run(["git", "commit", "-m", "docs: Add status report on failing GH PR merges"])
except Exception as e:
    pass
