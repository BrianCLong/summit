import sys
import re

files = ['.github/workflows/ci-core.yml', '.github/workflows/ci-pr.yml']

for file_path in files:
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()

        new_lines = []
        for line in lines:
            new_lines.append(line)
            if 'run: cd server && npm run migrate' in line:
                # Calculate indent
                indent = line[:len(line) - len(line.lstrip())]
                # Add env block
                new_lines.append(f"{indent}env:\n")
                new_lines.append(f"{indent}  ALLOW_BREAKING_MIGRATIONS: 'true'\n")
                new_lines.append(f"{indent}  CI: true\n")

        with open(file_path, 'w') as f:
            f.writelines(new_lines)
        print(f"Fixed {file_path}")

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
