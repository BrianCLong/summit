import re

with open('sales/hubspot-hygiene-customer-interview-script.md', 'r') as f:
    content = f.read()

content = re.sub(r'\*\*Goal: Understand the perception of Summit\'s sandbox and workflow.\*\*', 'Goal: Understand the perception of Summit\'s sandbox and workflow.', content)
content = re.sub(r'\*\*Goal: Quantify the value and capture revenue-adjacent impact.\*\*', 'Goal: Quantify the value and capture revenue-adjacent impact.', content)

with open('sales/hubspot-hygiene-customer-interview-script.md', 'w') as f:
    f.write(content)
