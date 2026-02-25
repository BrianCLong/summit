import re

files = ['.github/workflows/ci-core.yml', '.github/workflows/ci-pr.yml']

for file_path in files:
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()

        new_lines = []
        skip = False

        for i, line in enumerate(lines):
            new_lines.append(line)

            # Find the migrate step run command
            if 'run: cd server && npm run migrate' in line:
                # Check if env block exists next
                # If next line is not 'env:', we insert it.
                # If it IS 'env:', we insert our var into it.

                # Check indentation
                indent = len(line) - len(line.lstrip())

                # Look ahead
                if i + 1 < len(lines):
                    next_line = lines[i+1]
                    next_stripped = next_line.strip()

                    if next_stripped.startswith('env:'):
                        # Env block exists, we will append to it in the next loop iteration (not here)
                        # We need to find where to insert.
                        # Actually, easier to just replace the run line with run + env block?
                        # No, that duplicates env if it exists.
                        pass
                    else:
                        # No env block, insert one
                        env_indent = " " * (indent) # same level as run? No, typically env is sibling of run?
                        # YAML:
                        # - name: ...
                        #   run: ...
                        #   env:
                        #     FOO: bar

                        # So env indent should be same as run indent.
                        new_lines.append(f"{' ' * indent}env:\n")
                        new_lines.append(f"{' ' * (indent + 2)}ALLOW_BREAKING_MIGRATIONS: 'true'\n")
                        new_lines.append(f"{' ' * (indent + 2)}CI: true\n") # ensure CI is there if not

        # This simple logic fails if env block already exists.
        # Let's use a smarter approach: regex replace the specific step pattern if standard.
    except FileNotFoundError:
        print(f"Skipping {file_path}, not found")
        continue

# Better approach with regex for "run: cd server && npm run migrate"
# We replace it with:
# run: cd server && npm run migrate
# env:
#   ALLOW_BREAKING_MIGRATIONS: 'true'
#   ... (keep existing if we could parse, but simple string replace works if we assume structure)

# Actually, let's just use sed to insert 'env:\n  ALLOW_BREAKING_MIGRATIONS: "true"' after the run line.
# But we must respect indentation.
# All occurences of "run: cd server && npm run migrate" seem to be in the main steps.
