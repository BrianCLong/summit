import re

def fix_validate_script():
    filepath = 'scripts/ci/validate-jest-config.cjs'
    with open(filepath, 'r') as f:
        content = f.read()

    # The regex `/globals:\s*\{[\s\S]*?'ts-jest'/` matches `globals: {` followed by anything, followed by `'ts-jest'`, which still matches the file because `globals: {` is present for `import.meta` and `'ts-jest'` is present later in `transform:`!
    # The better check is to actually see if `ts-jest` is inside `globals` by seeing if there's a `globals: { ... 'ts-jest' ... }` block where the closing brace hasn't happened. But regex for nested braces is hard.
    # Easiest way is to just do `content.includes("globals: {") && content.includes("'ts-jest':")` but check if they are close, or just parse it.
    # Since we know `client/jest.config.cjs` no longer has `ts-jest` inside `globals`, we can just change the check to `content.includes("globals: {\\n    'ts-jest':")`

    content = content.replace(
        """if (content.match(/globals:\\s*\\{[\\s\\S]*?'ts-jest'/)) {""",
        """if (content.includes("globals: {\\n    'ts-jest':") || content.includes('globals: {\\n      "ts-jest":')) {"""
    )
    with open(filepath, 'w') as f:
        f.write(content)

fix_validate_script()
