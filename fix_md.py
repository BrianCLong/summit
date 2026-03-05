import os
import re


def fix_files():
    files_to_fix = [
        'docs/gtm/demo-runbook.md',
        'docs/gtm/gov-capability-statement.md',
        'docs/gtm/named-account-list-template.md',
        'docs/gtm/outreach-sequences.md',
        'docs/gtm/partner-program-structure.md',
        'docs/gtm/pilot-proposal-template.md',
        'docs/gtm/pricing.md',
        'docs/gtm/prime-partner-one-pager.md',
        'docs/gtm/reference-architecture.md',
        'docs/gtm/roi-tco-model.md',
        'docs/gtm/trust-center.md',
    ]
    for file in files_to_fix:
        if not os.path.exists(file): continue
        with open(file) as f:
            content = f.read()

        # Fix MD036: emphasis as heading (e.g. **Heading**) -> ### Heading
        # We need to be careful not to match all emphasis
        # Let's fix specific known ones if we can, or just replace bolding on single lines
        content = re.sub(r'^\*\*([^\*]+)\*\*$', r'### \1', content, flags=re.MULTILINE)
        content = re.sub(r'^\*([^\*]+)\*$', r'### \1', content, flags=re.MULTILINE)

        # Fix MD040: Fenced code blocks language
        content = re.sub(r'^```\s*$', r'```text', content, flags=re.MULTILINE)

        with open(file, 'w') as f:
            f.write(content)

fix_files()
