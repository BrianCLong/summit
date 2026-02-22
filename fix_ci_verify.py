import re

with open('.github/workflows/ci-verify.yml', 'r') as f:
    content = f.read()

# 1. Add pnpm/action-setup to ga-evidence-completeness
# Find the job start
job_pattern = r'(ga-evidence-completeness:[\s\S]*?steps:\n\s+- uses: actions/checkout@v4\n)'
# Insert pnpm setup after checkout
pnpm_step = '      - uses: actions/checkout@v4\n      - uses: pnpm/action-setup@c5ba7f7862a0f64c1b1a05fbac13e0b8e86ba08c # v4\n'

if 'uses: pnpm/action-setup' not in content.split('ga-evidence-completeness:')[1].split('setup-node')[0]:
    content = re.sub(job_pattern, pnpm_step, content, count=1)

# 2. Update setup-opa version
# We want to replace 'uses: open-policy-agent/setup-opa@...' with itself plus 'with: version: v0.68.0'
# BUT checking if 'with' already exists is hard with regex.
# Let's verify if we can just replace the line with a block.

opa_pattern = r'(uses: open-policy-agent/setup-opa@[^\n]+)(\n\s+with:\n\s+version: [^\n]+)?'
opa_replacement = r'\1\n        with:\n          version: v0.68.0'

# Use a function to avoid double 'with' if it exists (though regex optional group handles simple case)
def replace_opa(match):
    base = match.group(1)
    return f"{base}\n        with:\n          version: v0.68.0"

content = re.sub(opa_pattern, replace_opa, content)

with open('.github/workflows/ci-verify.yml', 'w') as f:
    f.write(content)
