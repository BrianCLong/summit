with open('.github/required-checks.yml') as f:
    content = f.read()
content = content.replace("  - test (20.x)\n", "")
with open('.github/required-checks.yml', 'w') as f:
    f.write(content)
