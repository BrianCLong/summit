import subprocess
import os

print("Getting current diff...")
diff = subprocess.run(["git", "diff", "--staged"], capture_output=True, text=True)
if diff.stdout:
    print("Committing...")
    subprocess.run(["git", "commit", "-m", "chore: fix CI failures"])
else:
    print("No changes to commit.")

subprocess.run(["git", "push", "origin", "feature/military-use-governance", "-f"])
