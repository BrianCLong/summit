#!/bin/bash
set -e

# Generate API Documentation
echo "Generating GraphQL types..."
pnpm graphql:codegen

echo "Generating OpenAPI Documentation..."
python - <<'PY'
import json
import pathlib
import yaml

spec_path = pathlib.Path('openapi/spec.yaml')
output = pathlib.Path('server/public/openapi.json')
output.parent.mkdir(parents=True, exist_ok=True)
data = yaml.safe_load(spec_path.read_text())
output.write_text(json.dumps(data, indent=2))
print(f"Wrote {output}")
PY

# Generate simple architecture diagrams if mermaid-cli is installed
if command -v mmdc &> /dev/null; then
    echo "Generating architecture diagrams..."
    # mmdc -i docs/architecture.mmd -o docs/architecture.png
else
    echo "mmdc (mermaid-cli) not found. Skipping diagram generation."
fi

echo "Documentation generation complete."
