#!/usr/bin/env bash
set -euo pipefail

#
# generate-sdks.sh
# Generate TypeScript and Python client SDKs from OpenAPI specifications
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

OPENAPI_DIR="$PROJECT_ROOT/openapi"
SDK_OUTPUT_DIR="$PROJECT_ROOT/sdks"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required tools
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is required but not installed. Please install Docker."
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed."
        exit 1
    fi

    log_success "All requirements satisfied"
}

# Generate TypeScript SDK
generate_typescript_sdk() {
    log_info "Generating TypeScript SDK from OpenAPI spec..."

    local spec_file="$OPENAPI_DIR/intelgraph-core-api.yaml"
    local output_dir="$SDK_OUTPUT_DIR/typescript"
    local config_file="$OPENAPI_DIR/sdk-config-typescript.json"

    if [[ ! -f "$spec_file" ]]; then
        log_error "OpenAPI spec not found: $spec_file"
        return 1
    fi

    # Clean output directory
    rm -rf "$output_dir"
    mkdir -p "$output_dir"

    # Generate SDK using openapi-generator Docker image
    docker run --rm \
        -v "$PROJECT_ROOT:/local" \
        -u "$(id -u):$(id -g)" \
        openapitools/openapi-generator-cli:v7.2.0 generate \
        -i "/local/openapi/intelgraph-core-api.yaml" \
        -g typescript-fetch \
        -o "/local/sdks/typescript" \
        -c "/local/openapi/sdk-config-typescript.json" \
        --additional-properties=npmName=@intelgraph/sdk,supportsES6=true

    log_success "TypeScript SDK generated at: $output_dir"

    # Install dependencies and build
    if [[ -f "$output_dir/package.json" ]]; then
        log_info "Installing TypeScript SDK dependencies..."
        cd "$output_dir"
        npm install --legacy-peer-deps || true
        npm run build || log_warn "TypeScript SDK build failed (this is normal for first generation)"
        cd "$PROJECT_ROOT"
    fi
}

# Generate Python SDK
generate_python_sdk() {
    log_info "Generating Python SDK from OpenAPI spec..."

    local spec_file="$OPENAPI_DIR/intelgraph-core-api.yaml"
    local output_dir="$SDK_OUTPUT_DIR/python"
    local config_file="$OPENAPI_DIR/sdk-config-python.json"

    if [[ ! -f "$spec_file" ]]; then
        log_error "OpenAPI spec not found: $spec_file"
        return 1
    fi

    # Clean output directory
    rm -rf "$output_dir"
    mkdir -p "$output_dir"

    # Generate SDK using openapi-generator Docker image
    docker run --rm \
        -v "$PROJECT_ROOT:/local" \
        -u "$(id -u):$(id -g)" \
        openapitools/openapi-generator-cli:v7.2.0 generate \
        -i "/local/openapi/intelgraph-core-api.yaml" \
        -g python \
        -o "/local/sdks/python" \
        -c "/local/openapi/sdk-config-python.json" \
        --additional-properties=packageName=intelgraph_sdk,projectName=intelgraph-sdk

    log_success "Python SDK generated at: $output_dir"

    # Setup virtual environment and install dependencies (optional)
    if command -v python3 &> /dev/null && [[ -f "$output_dir/setup.py" ]]; then
        log_info "Setting up Python SDK development environment..."
        cd "$output_dir"
        python3 -m venv venv || true
        # shellcheck disable=SC1091
        source venv/bin/activate || true
        pip install -e . || log_warn "Python SDK install failed (this is normal for first generation)"
        cd "$PROJECT_ROOT"
    fi
}

# Generate SDK documentation
generate_docs() {
    log_info "Generating SDK documentation..."

    # TypeScript docs
    if [[ -d "$SDK_OUTPUT_DIR/typescript" ]]; then
        log_info "Generating TypeScript API docs with TypeDoc..."
        cd "$SDK_OUTPUT_DIR/typescript"
        npx typedoc --out docs src || log_warn "TypeDoc generation failed"
        cd "$PROJECT_ROOT"
    fi

    # Python docs
    if [[ -d "$SDK_OUTPUT_DIR/python" ]]; then
        log_info "Generating Python API docs with Sphinx..."
        cd "$SDK_OUTPUT_DIR/python"
        if command -v sphinx-build &> /dev/null; then
            sphinx-build -b html docs docs/_build || log_warn "Sphinx docs generation failed"
        else
            log_warn "Sphinx not installed, skipping Python docs generation"
        fi
        cd "$PROJECT_ROOT"
    fi
}

# Create README files for SDKs
create_sdk_readmes() {
    log_info "Creating SDK README files..."

    # TypeScript README
    cat > "$SDK_OUTPUT_DIR/typescript/README.md" << 'EOF'
# IntelGraph TypeScript/JavaScript SDK

Official TypeScript/JavaScript SDK for the IntelGraph Platform API.

## Installation

```bash
npm install @intelgraph/sdk
# or
pnpm add @intelgraph/sdk
# or
yarn add @intelgraph/sdk
```

## Quick Start

```typescript
import { IntelGraphClient } from '@intelgraph/sdk';

const client = new IntelGraphClient({
  apiKey: process.env.INTELGRAPH_API_KEY,
  baseUrl: 'https://api.intelgraph.ai',
});

// Create a graph
const graph = await client.graphs.create({
  name: 'My Investigation',
  description: 'Analysis of suspicious activities',
});

// Add entity
const entity = await client.entities.create(graph.id, {
  type: 'Person',
  properties: {
    name: 'John Doe',
    email: 'john@example.com',
  },
});

console.log('Created entity:', entity.id);
```

## Documentation

- [API Documentation](https://docs.intelgraph.ai)
- [Integration Guide](https://docs.intelgraph.ai/integration)
- [Examples](https://github.com/intelgraph/examples)

## Support

- GitHub Issues: https://github.com/BrianCLong/summit/issues
- Email: support@intelgraph.ai

## License

MIT
EOF

    # Python README
    cat > "$SDK_OUTPUT_DIR/python/README.md" << 'EOF'
# IntelGraph Python SDK

Official Python SDK for the IntelGraph Platform API.

## Installation

```bash
pip install intelgraph-sdk
```

## Quick Start

```python
from intelgraph import IntelGraphClient

client = IntelGraphClient(
    api_key="your_api_key",
    base_url="https://api.intelgraph.ai"
)

# Create a graph
graph = client.graphs.create(
    name="My Investigation",
    description="Analysis of suspicious activities"
)

# Add entity
entity = client.entities.create(
    graph_id=graph.id,
    type="Person",
    properties={
        "name": "John Doe",
        "email": "john@example.com"
    }
)

print(f"Created entity: {entity.id}")
```

## Documentation

- [API Documentation](https://docs.intelgraph.ai)
- [Integration Guide](https://docs.intelgraph.ai/integration)
- [Examples](https://github.com/intelgraph/examples)

## Support

- GitHub Issues: https://github.com/BrianCLong/summit/issues
- Email: support@intelgraph.ai

## License

MIT
EOF

    log_success "SDK README files created"
}

# Main execution
main() {
    log_info "IntelGraph SDK Generation"
    log_info "========================="

    check_requirements

    # Parse command line arguments
    if [[ "${1:-all}" == "typescript" ]]; then
        generate_typescript_sdk
        create_sdk_readmes
    elif [[ "${1:-all}" == "python" ]]; then
        generate_python_sdk
        create_sdk_readmes
    else
        generate_typescript_sdk
        generate_python_sdk
        create_sdk_readmes
        generate_docs
    fi

    log_success "SDK generation complete!"
    log_info ""
    log_info "Generated SDKs:"
    log_info "  - TypeScript: $SDK_OUTPUT_DIR/typescript"
    log_info "  - Python: $SDK_OUTPUT_DIR/python"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Review generated SDKs in the sdks/ directory"
    log_info "  2. Test SDKs with integration examples"
    log_info "  3. Publish to npm/PyPI when ready"
}

# Run main function
main "$@"
