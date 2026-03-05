import os

filepath = 'docs/compliance/CONTROL_REGISTRY.md'
if os.path.exists(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    with open(filepath, 'w') as f:
        for line in lines:
            if line.startswith('| Control ') and not line.startswith('| Control ID |'):
                # Assuming it might be "| Control | Description |" etc.
                parts = line.split('|')
                if len(parts) > 1 and 'Control' in parts[1]:
                    parts[1] = ' Control ID '
                line = '|'.join(parts)
            f.write(line)
