with open('.github/workflows/pr-gates.yml') as f:
    content = f.read()
content = content.replace("helm lint helm/", "helm lint helm/summit/")
content = content.replace('node-version: "18"', 'node-version: "20"')
with open('.github/workflows/pr-gates.yml', 'w') as f:
    f.write(content)
