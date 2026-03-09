import re

with open('apps/intelgraph-api/package.json') as f:
    content = f.read()

content = re.sub(r'<<<<<<< ours\n\s*"@apollo/server": "4.11.3",\n=======\n\s*"@apollo/server": "\^4.13.0",\n>>>>>>> theirs', '"@apollo/server": "^4.13.0",', content)

with open('apps/intelgraph-api/package.json', 'w') as f:
    f.write(content)
