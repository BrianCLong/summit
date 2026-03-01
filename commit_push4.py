import subprocess
import os

print("Getting current diff...")
diff = subprocess.run(["git", "diff", "--staged"], capture_output=True, text=True)
if diff.stdout:
    print("Committing...")
    subprocess.run(["git", "commit", "-m", "chore: fix CI failures"])
    subprocess.run(["git", "push", "origin", "feature/military-use-governance", "-f"])
else:
    print("No changes to commit.")
