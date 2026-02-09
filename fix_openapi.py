import yaml

try:
    with open("docs/api-spec.yaml", "r") as f:
        spec = yaml.safe_load(f)

    if 'paths' in spec:
        for path, methods in spec['paths'].items():
            for method, op in methods.items():
                if method not in ['get', 'post', 'put', 'delete', 'patch']:
                    continue

                # Fix missing operationId
                if 'operationId' not in op:
                    # Generate one from path and method
                    clean_path = path.replace('/', '-').replace('{', '').replace('}', '').strip('-')
                    op['operationId'] = f"{method}-{clean_path}"

                # Fix missing tags
                if 'tags' not in op or not op['tags']:
                    # Generate one from path root
                    tag = path.split('/')[1] if len(path.split('/')) > 1 else 'default'
                    op['tags'] = [tag]

                    # Ensure tag is defined in global tags
                    if 'tags' not in spec:
                        spec['tags'] = []

                    if not any(t['name'] == tag for t in spec['tags']):
                        spec['tags'].append({'name': tag, 'description': f"Operations for {tag}"})

                # Fix missing description
                if 'description' not in op:
                    op['description'] = f"Operation for {method.upper()} {path}"

    with open("docs/api-spec.yaml", "w") as f:
        yaml.dump(spec, f, sort_keys=False)
        print("Patched docs/api-spec.yaml")

except Exception as e:
    print(f"Error patching OpenAPI: {e}")
