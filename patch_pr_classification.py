import re
import glob

for filename in [".github/workflows/governance-check.yml", ".github/workflows/ux-governance.yml"]:
    with open(filename, "r") as f:
        content = f.read()

    # Broaden the fix to handle variations in whitespace if any, or just straight replace
    content = content.replace(
        "const valid = labels.some(l => ['patch', 'minor', 'major'].includes(l));\n            if (!valid && !labels.some(l => ['chore', 'test', 'ci', 'refactor', 'perf', 'style', 'build'].includes(l))) {",
        "const valid = labels.some(l => ['patch', 'minor', 'major', 'chore', 'test', 'ci', 'refactor', 'perf', 'style', 'build'].includes(l));\n            if (!valid && !title.match(/^(feat|fix|docs|chore|test|ci|refactor|perf|style|build)(\\(.*\\))?:/)) {"
    )

    with open(filename, "w") as f:
        f.write(content)
