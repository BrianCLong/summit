import yaml
try:
    with open('.github/workflows/ci.yml', 'r') as f:
        data = yaml.safe_load(f)
    print("Jobs in ci.yml:", list(data.get('jobs', {}).keys()))
except Exception as e:
    print(e)
