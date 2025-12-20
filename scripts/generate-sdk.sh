#!/usr/bin/env bash
#
# SDK Generation Script
# Generates TypeScript and Python client SDKs from OpenAPI specification
# Issue: #11814 - API Documentation with OpenAPI/Swagger
#
# Usage:
#   ./scripts/generate-sdk.sh [typescript|python|all]
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OPENAPI_SPEC="${PROJECT_ROOT}/openapi/spec.yaml"
OUTPUT_DIR="${PROJECT_ROOT}/generated-clients"
TS_OUTPUT="${OUTPUT_DIR}/typescript"
PYTHON_OUTPUT="${OUTPUT_DIR}/python"

# Validate OpenAPI spec exists
if [ ! -f "${OPENAPI_SPEC}" ]; then
  echo -e "${RED}Error: OpenAPI specification not found at ${OPENAPI_SPEC}${NC}"
  exit 1
fi

echo -e "${GREEN}=== IntelGraph SDK Generation ===${NC}"
echo "OpenAPI Spec: ${OPENAPI_SPEC}"
echo "Output Directory: ${OUTPUT_DIR}"
echo ""

# Create output directories
mkdir -p "${TS_OUTPUT}"
mkdir -p "${PYTHON_OUTPUT}"

# Function to generate TypeScript client
generate_typescript() {
  echo -e "${YELLOW}Generating TypeScript client...${NC}"

  # Use openapi-typescript for type generation
  if command -v npx &> /dev/null; then
    npx openapi-typescript "${OPENAPI_SPEC}" \
      --output "${TS_OUTPUT}/api-types.ts" \
      --alphabetize \
      --export-type

    echo -e "${GREEN}✓ TypeScript types generated at ${TS_OUTPUT}/api-types.ts${NC}"
  else
    echo -e "${RED}Error: npx not found. Please install Node.js and npm.${NC}"
    return 1
  fi

  # Generate TypeScript fetch client
  if command -v docker &> /dev/null; then
    docker run --rm \
      -v "${PROJECT_ROOT}:/local" \
      openapitools/openapi-generator-cli:latest generate \
      -i /local/openapi/spec.yaml \
      -g typescript-fetch \
      -o /local/generated-clients/typescript-fetch \
      --additional-properties=typescriptThreePlus=true,supportsES6=true,npmName=@intelgraph/api-client,npmVersion=1.0.0

    echo -e "${GREEN}✓ TypeScript fetch client generated at ${TS_OUTPUT}-fetch/${NC}"
  else
    echo -e "${YELLOW}Warning: Docker not found. Skipping TypeScript fetch client generation.${NC}"
  fi
}

# Function to generate Python client
generate_python() {
  echo -e "${YELLOW}Generating Python client...${NC}"

  if command -v docker &> /dev/null; then
    docker run --rm \
      -v "${PROJECT_ROOT}:/local" \
      openapitools/openapi-generator-cli:latest generate \
      -i /local/openapi/spec.yaml \
      -g python \
      -o /local/generated-clients/python \
      --additional-properties=packageName=intelgraph_client,packageVersion=1.0.0,projectName=intelgraph-api-client

    echo -e "${GREEN}✓ Python client generated at ${PYTHON_OUTPUT}/${NC}"

    # Create setup instructions
    cat > "${PYTHON_OUTPUT}/INSTALL.md" <<EOF
# IntelGraph Python Client Installation

## Install from source

\`\`\`bash
cd ${PYTHON_OUTPUT}
pip install -e .
\`\`\`

## Usage

\`\`\`python
from intelgraph_client import ApiClient, Configuration
from intelgraph_client.api import cases_api

# Configure API client
configuration = Configuration(
    host="http://localhost:4000",
    access_token="your-jwt-token"
)

with ApiClient(configuration) as api_client:
    api_instance = cases_api.CasesApi(api_client)
    # Use the API
    cases = api_instance.get_cases()
    print(cases)
\`\`\`
EOF

    echo -e "${GREEN}✓ Python installation guide created${NC}"
  else
    echo -e "${RED}Error: Docker not found. Please install Docker to generate Python client.${NC}"
    return 1
  fi
}

# Function to create README for generated clients
create_readme() {
  cat > "${OUTPUT_DIR}/README.md" <<EOF
# IntelGraph API Client SDKs

Auto-generated client libraries for the IntelGraph Platform API.

## Generated Clients

- **TypeScript**: \`typescript/\` - Type definitions and fetch-based client
- **Python**: \`python/\` - Python client library

## Generation

These clients are generated from the OpenAPI specification at \`/openapi/spec.yaml\`.

To regenerate:

\`\`\`bash
# Generate all clients
./scripts/generate-sdk.sh all

# Generate specific client
./scripts/generate-sdk.sh typescript
./scripts/generate-sdk.sh python
\`\`\`

## TypeScript Usage

\`\`\`typescript
import type { paths } from './typescript/api-types';

// Type-safe API calls
const response = await fetch('http://localhost:4000/api/cases', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
  },
});

const cases: paths['/api/cases']['get']['responses']['200']['content']['application/json'] = await response.json();
\`\`\`

## Python Usage

See \`python/INSTALL.md\` for installation and usage instructions.

## Updating Clients

When the API changes:

1. Update \`openapi/spec.yaml\` with new endpoints/schemas
2. Run \`./scripts/generate-sdk.sh all\` to regenerate clients
3. Test the generated clients
4. Commit the updated clients

## License

MIT License - Copyright (c) 2025 IntelGraph
EOF

  echo -e "${GREEN}✓ README created at ${OUTPUT_DIR}/README.md${NC}"
}

# Parse command line argument
TARGET="${1:-all}"

case "${TARGET}" in
  typescript|ts)
    generate_typescript
    create_readme
    ;;
  python|py)
    generate_python
    create_readme
    ;;
  all)
    generate_typescript
    generate_python
    create_readme
    ;;
  *)
    echo -e "${RED}Error: Invalid target '${TARGET}'${NC}"
    echo "Usage: $0 [typescript|python|all]"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}=== SDK Generation Complete ===${NC}"
echo "Clients generated in: ${OUTPUT_DIR}"
echo ""
echo "Next steps:"
echo "  1. Review generated clients in ${OUTPUT_DIR}"
echo "  2. Test the clients against your API"
echo "  3. Publish to package registries (npm, PyPI) if needed"
echo ""
