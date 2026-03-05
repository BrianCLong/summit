with open('.github/workflows/graph-sync.yml', 'r') as f:
    content = f.read()

content = content.replace("compose-file: .github/compose/pg_neo.yml", "compose-file: deploy/compose/docker-compose.db.yml")

with open('.github/workflows/graph-sync.yml', 'w') as f:
    f.write(content)
