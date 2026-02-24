with open('.github/workflows/ci-verify.yml', 'r') as f:
    lines = f.readlines()

new_lines = []
prev_line = ""
for line in lines:
    clean_line = line.strip()
    if 'uses: pnpm/action-setup' in clean_line:
        if clean_line == prev_line:
            continue
        prev_line = clean_line
    else:
        prev_line = ""
    new_lines.append(line)

with open('.github/workflows/ci-verify.yml', 'w') as f:
    f.writelines(new_lines)
