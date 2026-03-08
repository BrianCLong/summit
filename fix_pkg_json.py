import json

with open('package.json') as f:
    pkg = json.load(f)

pkg['scripts']['ga:evidence'] = 'pnpm compliance:evidence'

with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
