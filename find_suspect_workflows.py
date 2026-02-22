import os

for root, dirs, files in os.walk(".github/workflows"):
    for file in files:
        if not file.endswith(".yml"):
            continue
        path = os.path.join(root, file)
        try:
            with open(path, "r") as f:
                content = f.read()
                # Split content into jobs
                jobs = content.split("\n  ")
                for job in jobs:
                    if "cache:" in job and "pnpm" in job:
                        # Look for install commands in THIS job
                        has_install = False
                        for cmd in ["pnpm install", "pnpm i ", "pnpm add", "pnpm -w install"]:
                            if cmd in job:
                                has_install = True
                                break
                        if not has_install:
                             # Also check if it's a reusable workflow call that might handle it
                             if "uses: ./.github/workflows/" not in job:
                                 print(f"{path}: Job seems to use pnpm cache without install")
        except:
            pass
