import json

paths = ['server/package.json', 'ui/package.json', 'package.json']
for p in paths:
    with open(p, 'r') as f:
        data = json.load(f)
    print(f"{p}: {data.get('version')}")
    data['version'] = '4.2.3'
    with open(p, 'w') as f:
        json.dump(data, f, indent=2)
