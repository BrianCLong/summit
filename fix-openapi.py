import yaml
import sys

def main():
    try:
        with open('docs/api-spec.yaml', 'r') as f:
            data = yaml.safe_load(f)
    except Exception as e:
        print(f"Error reading YAML: {e}")
        return

    # Fix Info contact
    if 'info' in data and 'contact' not in data['info']:
        data['info']['contact'] = {
            'name': 'API Support',
            'email': 'support@example.com'
        }

    # Make sure global tags exist
    global_tags = set([t['name'] for t in data.get('tags', [])])
    if 'tags' not in data:
        data['tags'] = []

    if 'paths' in data:
        for path, path_item in data['paths'].items():
            for method, operation in path_item.items():
                if method not in ['get', 'post', 'put', 'delete', 'patch']:
                    continue

                # Fix missing description
                if 'description' not in operation or not operation['description']:
                    operation['description'] = operation.get('summary', f'{method.upper()} {path}')

                # Fix missing operationId
                if 'operationId' not in operation:
                    # Create a deterministic operationId based on method and path
                    parts = [p.strip('{}') for p in path.strip('/').split('/')]
                    parts = [p.capitalize() for p in parts]
                    operation['operationId'] = method + ''.join(parts)

                # Collect tags
                if 'tags' in operation:
                    for tag in operation['tags']:
                        if tag not in global_tags:
                            data['tags'].append({'name': tag})
                            global_tags.add(tag)

    try:
        with open('docs/api-spec.yaml', 'w') as f:
            yaml.dump(data, f, sort_keys=False, default_flow_style=False)
        print("Successfully updated docs/api-spec.yaml")
    except Exception as e:
        print(f"Error writing YAML: {e}")

if __name__ == '__main__':
    main()
