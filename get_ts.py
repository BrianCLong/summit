import json
c = json.load(open('server/tsconfig.json'))['compilerOptions']
print(f"outDir: {c.get('outDir')}")
print(f"rootDir: {c.get('rootDir')}")
