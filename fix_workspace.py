import yaml

with open('pnpm-workspace.yaml', 'r') as f:
    data = yaml.safe_load(f)

data['packages'] = list(dict.fromkeys(data['packages'])) # Deduplicate preserving order

with open('pnpm-workspace.yaml', 'w') as f:
    yaml.dump(data, f, sort_keys=False)
