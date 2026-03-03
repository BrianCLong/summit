import yaml
import sys

def main():
    with open('docs/api-spec.yaml', 'r') as f:
        data = yaml.safe_load(f)

    # Collect existing operation IDs to ensure uniqueness
    op_ids = set()
    if 'paths' in data:
        for path, path_item in data['paths'].items():
            for method, operation in path_item.items():
                if method not in ['get', 'post', 'put', 'delete', 'patch']:
                    continue
                if 'operationId' in operation:
                    base_op_id = operation['operationId']
                    op_id = base_op_id
                    counter = 1
                    while op_id in op_ids:
                        op_id = f"{base_op_id}{counter}"
                        counter += 1
                    operation['operationId'] = op_id
                    op_ids.add(op_id)

    with open('docs/api-spec.yaml', 'w') as f:
        yaml.dump(data, f, sort_keys=False, default_flow_style=False)

if __name__ == '__main__':
    main()
