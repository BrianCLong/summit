with open("pnpm-lock.yaml", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    # around line 47316 there is a duplicate key
    if "@as-integrations/express4@1.1.1" in line and i > 47300 and i < 47350:
        if "@as-integrations/express4@1.1.1" in "".join(new_lines[-10:]):
            skip = True
            continue
    if skip and "dependencies:" in line:
        pass # Still skipping
    elif skip and line.startswith("  "):
        pass # Still skipping
    elif skip:
        skip = False # stopped skipping
    if not skip:
        new_lines.append(line)

with open("pnpm-lock.yaml", "w") as f:
    f.writelines(new_lines)
