import json

with open('agent-contract.json') as f:
    data = json.load(f)

for pattern in data['piiPatterns']:
    if pattern['name'] == 'CreditCard':
        # Add boundary matching to avoid matching version hashes
        pattern['pattern'] = "\\b(?:\\d[ -]*?){13,16}\\b"

with open('agent-contract.json', 'w') as f:
    json.dump(data, f, indent=2)
