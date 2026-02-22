import os
import yaml

# Workflows we already fixed or identified
files_to_check = [
    ".github/workflows/ci-core.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/ci-verify.yml",
    ".github/workflows/ci-pr.yml",
    ".github/workflows/mvp4-gate.yml",
    ".github/workflows/pr-gates.yml"
]

# Add more from the suspect list
import re

def fix_file(path):
    if not os.path.exists(path):
        return
    with open(path, "r") as f:
        content = f.read()

    # Split by jobs
    parts = re.split(r'(\n  \w+:)', content)
    new_parts = []
    changed = False

    for i, part in enumerate(parts):
        if i > 0 and i % 2 == 0:
            # This is a job body
            job_body = part
            if "cache:" in job_body and ("pnpm" in job_body or "'pnpm'" in job_body or '"pnpm"' in job_body):
                has_install = False
                for cmd in ["pnpm install", "pnpm i ", "pnpm add", "pnpm -w install"]:
                    if cmd in job_body:
                        has_install = True
                        break
                if not has_install:
                    print(f"Removing pnpm cache from job in {path}")
                    job_body = re.sub(r'^\s*cache:\s*[\'"]?pnpm[\'"]?.*$', '', job_body, flags=re.MULTILINE)
                    changed = True
            new_parts.append(job_body)
        else:
            new_parts.append(part)

    if changed:
        with open(path, "w") as f:
            f.write("".join(new_parts))

# Get all workflows
for root, dirs, files in os.walk(".github/workflows"):
    for file in files:
        if file.endswith(".yml"):
            fix_file(os.path.join(root, file))
