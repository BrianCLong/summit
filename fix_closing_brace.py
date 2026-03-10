with open('server/src/federation/service.ts', 'r') as f:
    lines = f.readlines()

while lines and lines[-1].strip() == '}':
    lines.pop()
lines.append('}\n')

with open('server/src/federation/service.ts', 'w') as f:
    f.writelines(lines)
