import re
import os

def fix_file(filepath):
    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        return

    new_lines = []

    for i, line in enumerate(lines):
        # MD022: Blanks around headings
        if re.match(r'^#+\s', line):
            if new_lines and new_lines[-1].strip() != '':
                new_lines.append('\n')
            new_lines.append(line)
            if i < len(lines) - 1 and lines[i+1].strip() != '':
                 new_lines.append('\n')
            continue

        # MD031/MD040: Fenced code blocks
        if line.strip().startswith('```'):
            if new_lines and new_lines[-1].strip() != '':
                new_lines.append('\n')

            if line.strip() == '```':
                line = '```text\n'
            new_lines.append(line)
            continue

        # MD030: Spaces after list markers
        line = re.sub(r'^(\s*[-*])\s{2,}(?=\S)', r'\1 ', line)
        line = re.sub(r'^(\s*\d+\.)\s{2,}(?=\S)', r'\1 ', line)

        # MD032: Blanks around lists
        is_list = re.match(r'^(\s*[-*]|\s*\d+\.)\s+', line)
        if is_list:
             if new_lines and new_lines[-1].strip() != '' and not re.match(r'^(\s*[-*]|\s*\d+\.)\s+', new_lines[-1]) and not re.match(r'^#+\s', new_lines[-1]):
                  new_lines.append('\n')

        # MD007: Unordered list indentation (2 spaces)
        if re.match(r'^\s{4}[-*]\s', line):
            line = re.sub(r'^\s{4}', '  ', line)

        new_lines.append(line)

    with open(filepath, 'w') as f:
        f.writelines(new_lines)

files = [
    "docs/gtm/trust-center.md",
    "docs/guides/DELEGATED_ADMIN.md",
    "docs/guides/LOCALE_RESOURCE_STRUCTURE.md",
    "docs/guides/war_rooms.md",
    "docs/H2_2026_EXIT_READINESS_PLAYBOOK.md",
    "docs/health_score.md",
    "docs/HIGH_IMPACT_DEVELOPMENT_PROMPTS.md",
    "docs/high-risk-ops-security-approvals-pack.md",
    "docs/how-to-debug-lock-contention.md",
    "docs/how-to/advanced-graphql-queries.md",
    "docs/how-to/kubernetes-production-deployment.md",
    "docs/how-to/stix-taxii-misp-interop.md",
    "docs/how-to/zip-export.md",
    "docs/HUMAN_AI_COLLAB_INTEL_ROADMAP_2026.md",
    "docs/HUMAN_AI_COLLABORATION.md",
    "docs/hypergrowth-cosmic-vision.md"
]

for f in files:
    fix_file(f)
