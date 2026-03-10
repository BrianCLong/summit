import glob

files = glob.glob(".github/workflows/**/*.yml", recursive=True) + glob.glob(".github/workflows/**/*.yaml", recursive=True)

for file in files:
    with open(file, "r") as f:
        content = f.read()

    new_content = content.replace("npm install js-yaml\n", "pnpm install js-yaml\n")
    if "pnpm install js-yaml" not in content and "npm install js-yaml" in content:
        # Just in case there are parameters attached
        new_content = new_content.replace("npm install js-yaml", "pnpm install -w js-yaml")

    if new_content != content:
        with open(file, "w") as f:
            f.write(new_content)
