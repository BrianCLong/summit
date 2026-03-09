import re

with open('.github/workflows/comprehensive-test.yml') as f:
    content = f.read()

content = re.sub(r"python-version: '3.10'", "python-version: '3.11'", content)
content = re.sub(r"node-version: 20", "node-version-file: '.nvmrc'", content)

with open('.github/workflows/comprehensive-test.yml', 'w') as f:
    f.write(content)
