# Deploy Profiles

## Staging
```bash
helm upgrade --install agent-workbench charts/agent-workbench -f charts/agent-workbench/values.yaml \
  --set image.tag=$(git rev-parse --short HEAD)
```

## Production
```bash
helm upgrade --install agent-workbench charts/agent-workbench -f charts/agent-workbench/values-prod.yaml \
  --set image.tag=$(git describe --tags --abbrev=0)
```

## Swap A2A to governed endpoint
```bash
./scripts/swap-a2a.sh https://agent.example.com
make all
```