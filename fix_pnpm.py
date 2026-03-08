import glob
import re

workflows = glob.glob('.github/workflows/**/*.yml', recursive=True)

for wf in workflows:
    with open(wf) as f:
        content = f.read()

    # The previous script might have accidentally removed `version: ...` that wasn't `9.12.0` because we had some buggy regexes
    # We should only touch exactly `version: 9.12.0` (or similar quotes) inside a `with:` block under `uses: pnpm/action-setup@v[0-9]`

    # We already did `git reset --hard HEAD~1` so we are back to the original files.
    # Let's just do a simple string replace for the ones we know are bad.

    # First let's just find and replace the EXACT block that's causing issues.
    content = content.replace("uses: pnpm/action-setup@v4\n        with:\n          version: 9.12.0\n", "uses: pnpm/action-setup@v4\n")
    content = content.replace("uses: pnpm/action-setup@v3\n        with:\n          version: 9.12.0\n", "uses: pnpm/action-setup@v3\n")
    content = content.replace("uses: pnpm/action-setup@v2\n        with:\n          version: 9.12.0\n", "uses: pnpm/action-setup@v2\n")
    content = content.replace("uses: pnpm/action-setup@v4\n        with:\n          version: '9.12.0'\n", "uses: pnpm/action-setup@v4\n")
    content = content.replace("uses: pnpm/action-setup@v3\n        with:\n          version: '9.12.0'\n", "uses: pnpm/action-setup@v3\n")
    content = content.replace("uses: pnpm/action-setup@v2\n        with:\n          version: '9.12.0'\n", "uses: pnpm/action-setup@v2\n")
    content = content.replace("uses: pnpm/action-setup@v4\n        with:\n          version: \"9.12.0\"\n", "uses: pnpm/action-setup@v4\n")
    content = content.replace("uses: pnpm/action-setup@v3\n        with:\n          version: \"9.12.0\"\n", "uses: pnpm/action-setup@v3\n")
    content = content.replace("uses: pnpm/action-setup@v2\n        with:\n          version: \"9.12.0\"\n", "uses: pnpm/action-setup@v2\n")

    content = content.replace("uses: pnpm/action-setup@v4\n        with: { version: 9.12.0 }\n", "uses: pnpm/action-setup@v4\n")
    content = content.replace("uses: pnpm/action-setup@v3\n        with: { version: 9.12.0 }\n", "uses: pnpm/action-setup@v3\n")

    content = content.replace("PNPM_VERSION: '9.12.0'", 'PNPM_VERSION: "10.0.0"')
    content = content.replace('PNPM_VERSION: "9.12.0"', 'PNPM_VERSION: "10.0.0"')
    content = content.replace('pnpm-version:\n        required: false\n        type: string\n        default: \'9.12.0\'', 'pnpm-version:\n        required: false\n        type: string\n        default: \'10.0.0\'')
    content = content.replace('pnpm-version:\n        description: "Version of pnpm to use"\n        required: false\n        type: string\n        default: "9.12.0"', 'pnpm-version:\n        description: "Version of pnpm to use"\n        required: false\n        type: string\n        default: "10.0.0"')
    content = content.replace('pnpm_version:\n        description: "Version of pnpm to use"\n        required: false\n        type: string\n        default: "9.12.0"', 'pnpm_version:\n        description: "Version of pnpm to use"\n        required: false\n        type: string\n        default: "10.0.0"')

    with open(wf, 'w') as f:
        f.write(content)
