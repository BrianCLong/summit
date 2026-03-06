import yaml

def fix_openapi():
    with open('docs/api-spec.yaml', 'r') as f:
        spec = yaml.safe_load(f)

    # Fix Info object contact
    if 'info' in spec:
        spec['info']['contact'] = {
            'name': 'API Support',
            'email': 'support@example.com'
        }

    # Helper to fix operations
    def fix_operation(path, method, op):
        # Add operationId if missing
        if 'operationId' not in op:
            # Generate a reasonable ID from path and method
            clean_path = path.replace('/', '_').replace('{', '').replace('}', '')
            op['operationId'] = f"{method}{clean_path}"

        # Add description if missing
        if 'description' not in op:
            op['description'] = op.get('summary', 'Operation description')

        # Ensure tags are defined
        if 'tags' in op:
            for tag in op['tags']:
                if 'tags' not in spec:
                    spec['tags'] = []
                if not any(t['name'] == tag for t in spec['tags']):
                    spec['tags'].append({'name': tag, 'description': f"{tag} operations"})

    if 'paths' in spec:
        for path, methods in spec['paths'].items():
            for method, op in methods.items():
                if method in ['get', 'post', 'put', 'delete', 'patch']:
                    fix_operation(path, method, op)

    with open('docs/api-spec.yaml', 'w') as f:
        yaml.dump(spec, f, default_flow_style=False, sort_keys=False)

if __name__ == '__main__':
    fix_openapi()
