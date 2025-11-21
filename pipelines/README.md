# Summit Unified Pipeline Orchestration

A unified system for defining, running, and monitoring data pipelines across multiple execution runtimes.

## Quick Start

```bash
# List all pipelines
just pipelines-list

# Run a pipeline
just pipelines-run demo-hello-world

# Visualize pipeline graph
just pipelines-graph demo-hello-world

# Validate manifests
just pipelines-validate
```

## Documentation

See [docs/PIPELINES_AND_ORCHESTRATION.md](../docs/PIPELINES_AND_ORCHESTRATION.md) for comprehensive documentation.

## Directory Structure

```
pipelines/
├── schema/           # JSON schema for pipeline manifests
├── manifests/        # Pipeline definitions (YAML)
├── registry/         # Pipeline registry core
├── runners/          # Execution engines (local, CI)
├── adaptors/         # Runtime adaptors (Airflow, Maestro)
├── tests/            # Unit and integration tests
├── demo/             # Demo pipeline outputs
└── cli.py            # Command-line interface
```

## Key Features

- 🎯 Single manifest format for all runtimes
- 🔄 Multi-runtime support (Airflow, Maestro, local)
- 📊 Automatic OpenLineage tracking
- 🎨 Visual pipeline graphs
- 📝 Comprehensive validation
- 🚀 Simple CLI and Make integration

## Development

### Install Dependencies

```bash
pip install -r pipelines/requirements.txt
```

### Run Tests

```bash
pytest pipelines/tests/ -v
```

### Create New Pipeline

1. Create manifest in `pipelines/manifests/my-pipeline.yaml`
2. Validate: `just pipelines-validate`
3. Test locally: `just pipelines-run my-pipeline`
4. Generate for runtime: `just pipelines-generate-airflow`

## Examples

- `manifests/intelligence-coordination-batch.yaml` - Multi-stage intelligence pipeline
- `manifests/cisa-kev-ingest.yaml` - CISA vulnerability ingestion
- `manifests/demo-hello-world.yaml` - Simple demo pipeline
- `manifests/runbook-ransomware-triage.yaml` - Incident response workflow

## License

Internal use only - Summit Intelligence Platform
