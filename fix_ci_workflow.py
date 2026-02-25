import re

with open('.github/workflows/ci.yml', 'r') as f:
    content = f.read()

# Pattern to find Setup Node followed by Setup pnpm
# We look for the 'lint' job block and 'typecheck' job block specifically or just globally if the pattern is unique enough.
# The pattern is:
# - name: Setup Node
#   uses: actions/setup-node@v4
#   with:
#     cache: 'pnpm'
#     node-version-file: .nvmrc
# - name: Setup pnpm
#   uses: pnpm/action-setup@v4

# We want to swap these blocks.

def swap_steps(match):
    node_block = match.group(1)
    pnpm_block = match.group(2)
    return pnpm_block + node_block

# Regex attempts to capture the two blocks. Adjust indentation matching carefully.
# We assume standard indentation of 6 spaces for steps.
pattern = r'(      - name: Setup Node\n\s+uses: actions/setup-node@v4\n\s+with:\n\s+cache: \'pnpm\'\n\s+node-version-file: .nvmrc\n)(      - name: Setup pnpm\n\s+uses: pnpm/action-setup@v4\n)'

new_content = re.sub(pattern, swap_steps, content)

# Also check for variations in indentation or parameter order if needed (e.g. node-version-file before cache)
# In typecheck job:
#       - name: Setup Node
#         uses: actions/setup-node@v4
#         with:
#           node-version-file: .nvmrc
#           cache: 'pnpm'
pattern2 = r'(      - name: Setup Node\n\s+uses: actions/setup-node@v4\n\s+with:\n\s+node-version-file: .nvmrc\n\s+cache: \'pnpm\'\n)(      - name: Setup pnpm\n\s+uses: pnpm/action-setup@v4\n)'

new_content = re.sub(pattern2, swap_steps, new_content)

with open('.github/workflows/ci.yml', 'w') as f:
    f.write(new_content)
