import glob
import os
import subprocess

def fix_files():
    files = glob.glob(".github/workflows/*.yml")
    target_files = []

    # Identify files needing fix
    for f in files:
        with open(f, 'r') as content:
            if "        with:\n" in content.read():
                target_files.append(f)

    print(f"Found {len(target_files)} files to fix.")

    batch_size = 20
    for i in range(0, len(target_files), batch_size):
        batch = target_files[i:i+batch_size]
        print(f"Processing batch {i}-{i+batch_size}...")

        # Apply fix
        for file_path in batch:
            subprocess.run(["sed", "-i", "/^\s*with:\s*$/d", file_path], check=True)

        # Commit batch
        subprocess.run(["git", "add"] + batch, check=True)
        subprocess.run(["git", "commit", "-m", f"Fix invalid YAML in batch {i//batch_size + 1}"], check=True)

if __name__ == "__main__":
    fix_files()
