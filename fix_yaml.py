with open('.github/workflows/ci-verify.yml', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = 0
for i, line in enumerate(lines):
    if skip > 0:
        skip -= 1
        continue

    # Check for the double 'with' block I introduced
    if 'uses: open-policy-agent/setup-opa' in line:
        new_lines.append(line)
        # Check if next lines are duplicated 'with' blocks
        # My sed command likely added:
        # with:
        #   version: v0.68.0
        # with:
        #   version: v0.68.0
        # ...

        # We will manually construct the block we want
        new_lines.append("        with:\n")
        new_lines.append("          version: v0.68.0\n")

        # Now skip any subsequent lines that match the block we just added (or erroneous ones)
        # We look ahead
        j = i + 1
        while j < len(lines):
            l = lines[j].strip()
            if l.startswith('with:') or l.startswith('version: v0.68.0'):
                skip += 1
                j += 1
            else:
                break
    else:
        new_lines.append(line)

with open('.github/workflows/ci-verify.yml', 'w') as f:
    f.writelines(new_lines)
