import subprocess
res = subprocess.run(['/usr/bin/git', 'show', '--name-only', '--format='], capture_output=True, text=True)
files = res.stdout.split('\n')
print(f'Total files: {len(files)}')
print(f'Contains policies: {any(f.startswith("policies/") for f in files)}')
print(f'Contains packages: {any(f.startswith("packages/summit-") for f in files)}')
print(f'Contains pnpm-lock.yaml: {"pnpm-lock.yaml" in files}')
