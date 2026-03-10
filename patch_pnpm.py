import glob

files = glob.glob(".github/workflows/**/*.yml", recursive=True) + glob.glob(".github/workflows/**/*.yaml", recursive=True)

for file in files:
    with open(file, "r") as f:
        content = f.read()

    new_content = content.replace("version: 10.0.0", "version: 10.3.0")

    if new_content != content:
        with open(file, "w") as f:
            f.write(new_content)
