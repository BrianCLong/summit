import re

with open('sales/hubspot-hygiene-scorecard-template.md', 'r') as f:
    content = f.read()

content = content.replace("## Readiness Assessment\n* [x]", "## Readiness Assessment\n\n* [x]")

with open('sales/hubspot-hygiene-scorecard-template.md', 'w') as f:
    f.write(content)
