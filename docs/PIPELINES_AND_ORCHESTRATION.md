# Pipelines & Orchestration

**Summit Unified Orchestration System**

## Overview

Summit's orchestration layer provides a unified interface for defining, running, and monitoring data pipelines across multiple execution runtimes (Airflow, Maestro, local/CI). This consolidation eliminates the complexity of managing disparate orchestration systems while maintaining flexibility and compatibility.

### Key Features

- 🎯 **Single Manifest Format**: Define pipelines once, run anywhere
- 🔄 **Multi-Runtime Support**: Airflow, Maestro, local execution, Docker
- 📊 **Automatic Lineage Tracking**: OpenLineage integration for all runs
- 🎨 **Visual Pipeline Graphs**: Mermaid, Graphviz, ASCII visualization
- 📝 **Comprehensive Registry**: Discover, filter, and query all pipelines
- 🔍 **Validation & Testing**: Built-in manifest validation and test framework
- 🚀 **CLI & Make Integration**: Simple commands for all operations

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Pipeline Manifest Format](#pipeline-manifest-format)
3. [CLI Commands](#cli-commands)
4. [Creating Pipelines](#creating-pipelines)
5. [Running Pipelines](#running-pipelines)
6. [OpenLineage Integration](#openlineage-integration)
7. [Airflow DAG Generation](#airflow-dag-generation)
8. [RUNBOOKS to Pipelines](#runbooks-to-pipelines)
9. [Architecture](#architecture)
10. [Examples](#examples)

---

## Quick Start

### List All Pipelines

```bash
# Using Just
just pipelines-list

# Using Python CLI directly
python3 pipelines/cli.py list
```

### Run a Pipeline

```bash
# Run demo pipeline (dry-run)
just pipelines-demo-cisa

# Run specific pipeline
just pipelines-run cisa-kev-ingest

# With custom context
just pipelines-run intelligence-coordination-batch '{"debug": true}'
```

### Visualize Pipeline Graph

```bash
# ASCII visualization
just pipelines-graph demo-hello-world

# Mermaid format (for rendering)
just pipelines-graph demo-hello-world mermaid

# Graphviz DOT format
just pipelines-graph demo-hello-world dot
```

### Validate Pipelines

```bash
# Validate all manifests
just pipelines-validate

# Show pipeline details
just pipelines-info cisa-kev-ingest
```

---

## Pipeline Manifest Format

### Schema

Pipelines are defined using YAML manifests conforming to the schema in:
```
pipelines/schema/pipeline-manifest.schema.json
```

### Basic Structure

```yaml
apiVersion: summit.io/v1
kind: Pipeline
metadata:
  name: my-pipeline
  description: Human-readable description
  owners:
    - team@summit.io
  tags:
    domain: security
    criticality: high
  annotations:
    runbook: https://summit.io/runbooks/my-pipeline
    source: path/to/original/dag.py

spec:
  schedule:
    cron: "0 2 * * *"
    timezone: UTC
    enabled: true

  inputs:
    - name: input_dataset
      namespace: s3://bucket/path
      facets:
        schema:
          fields:
            - name: id
              type: string

  outputs:
    - name: output_dataset
      namespace: neo4j://prod/results

  tasks:
    - id: task1
      name: Extract Data
      type: python
      code:
        module: jobs.extract
        function: extract_data
      params:
        batch_size: 1000
      retry:
        attempts: 3
        delay: 5m
        backoff: exponential
      timeout: 30m

    - id: task2
      name: Transform Data
      type: python
      depends_on:
        - task1
      code:
        module: jobs.transform
        function: transform_data
      timeout: 1h

  governance:
    budget:
      per_run_usd: 10.00
    slo:
      latency_p95_ms: 3600000
      success_rate_percent: 99.0

  observability:
    openlineage:
      enabled: true
      namespace: summit-prod

  execution:
    runtime: maestro
    concurrency: 3
    catchup: false
```

### Task Types

#### Python Tasks

```yaml
- id: python_task
  type: python
  code:
    module: jobs.my_module
    function: my_function
    # OR
    script: scripts/my_script.py
    # OR
    command: "print('inline python')"
  params:
    key: value
  env:
    ENV_VAR: value
```

#### Bash Tasks

```yaml
- id: bash_task
  type: bash
  code:
    command: |
      echo "Multi-line bash script"
      ls -la
    # OR
    script: scripts/my_script.sh
  env:
    CUSTOM_VAR: value
```

#### Docker Tasks

```yaml
- id: docker_task
  type: docker
  code:
    image: my-image:latest
    command: ["python", "script.py"]
  env:
    KEY: value
```

#### Node Tasks

```yaml
- id: node_task
  type: node
  code:
    script: scripts/my_script.js
  env:
    NODE_ENV: production
```

### Retry & Timeout Configuration

```yaml
retry:
  attempts: 3          # Number of retries
  delay: 5m           # Delay between retries (s/m/h)
  backoff: exponential # fixed | exponential
timeout: 30m          # Task timeout (s/m/h)
```

### Dependencies

Tasks can depend on one or more other tasks:

```yaml
tasks:
  - id: task_a
    type: python
    code: {...}

  - id: task_b
    type: python
    depends_on:
      - task_a
    code: {...}

  - id: task_c
    type: python
    depends_on:
      - task_a
      - task_b
    code: {...}
```

---

## CLI Commands

### Available Commands

```bash
# List pipelines
pipelines/cli.py list [--runtime RUNTIME] [--owner OWNER] [--tag KEY=VALUE]

# Run pipeline
pipelines/cli.py run PIPELINE_NAME [--context JSON] [--run-id ID] [--dry-run]

# Visualize graph
pipelines/cli.py graph PIPELINE_NAME [--format ascii|mermaid|dot|json]

# Show details
pipelines/cli.py info PIPELINE_NAME [--format text|json]

# Validate manifests
pipelines/cli.py validate [--name PIPELINE_NAME]

# Generate Airflow DAGs
pipelines/cli.py generate-airflow [--pipeline NAME] [--output-dir DIR]
```

### Just Recipes

```bash
# List commands
just pipelines-list                      # All pipelines (table)
just pipelines-scheduled                 # Scheduled only
just pipelines-by-runtime airflow        # Filter by runtime
just pipelines-by-owner team@summit.io   # Filter by owner

# Run commands
just pipelines-run PIPELINE_NAME         # Execute pipeline
just pipelines-demo-cisa                 # Demo run (dry-run)

# Visualization
just pipelines-graph PIPELINE_NAME       # ASCII visualization
just pipelines-graph PIPELINE_NAME mermaid # Mermaid format

# Info & validation
just pipelines-info PIPELINE_NAME        # Detailed info
just pipelines-validate                  # Validate all
just pipelines-summary                   # Registry summary

# Generation
just pipelines-generate-airflow          # Generate all Airflow DAGs
```

---

## Creating Pipelines

### Step 1: Define Manifest

Create a YAML file in `pipelines/manifests/`:

```bash
touch pipelines/manifests/my-new-pipeline.yaml
```

### Step 2: Write Manifest

Use the schema and examples as reference:

```yaml
apiVersion: summit.io/v1
kind: Pipeline
metadata:
  name: my-new-pipeline
  description: My awesome pipeline
  owners:
    - my-team@summit.io
  tags:
    domain: data-engineering
    scope: etl
spec:
  tasks:
    - id: extract
      type: python
      code:
        module: jobs.extract
        function: run
    - id: load
      type: python
      depends_on: [extract]
      code:
        module: jobs.load
        function: run
```

### Step 3: Validate

```bash
just pipelines-validate
```

### Step 4: Test Locally

```bash
just pipelines-run my-new-pipeline
```

### Step 5: Generate for Production Runtime

```bash
# For Airflow
just pipelines-generate-airflow
# DAG created in airflow/dags/my-new-pipeline.py

# For Maestro - manifests are already compatible!
```

---

## Running Pipelines

### Local Execution

The local runner executes tasks sequentially according to dependency order:

```bash
python3 pipelines/cli.py run my-pipeline
```

Features:
- Topological task ordering
- Retry logic with exponential backoff
- Timeout enforcement
- Context propagation
- OpenLineage event emission

### Airflow Execution

1. Generate Airflow DAG:
   ```bash
   just pipelines-generate-airflow
   ```

2. Deploy to Airflow:
   ```bash
   cp airflow/dags/*.py /path/to/airflow/dags/
   ```

3. Trigger via Airflow UI or CLI

### Maestro Execution

Maestro can directly consume pipeline manifests:

```bash
maestro-cli run --manifest pipelines/manifests/my-pipeline.yaml
```

---

## OpenLineage Integration

All pipeline runs automatically emit OpenLineage events for lineage tracking.

### Configuration

In pipeline manifest:

```yaml
spec:
  observability:
    openlineage:
      enabled: true
      namespace: summit-prod
```

### Environment Variables

```bash
export OPENLINEAGE_URL="http://localhost:5000"
export OPENLINEAGE_API_KEY="your-api-key"
```

### Events Emitted

1. **Run Start**: Job metadata, inputs, outputs
2. **Run Complete**: Duration, status, facets

### Viewing Lineage

Use Marquez UI or compatible OpenLineage viewer:

```bash
open http://localhost:3000  # Marquez UI
```

---

## Airflow DAG Generation

The Airflow generator converts pipeline manifests into Airflow DAG Python files.

### Generate All DAGs

```bash
just pipelines-generate-airflow
```

### Generate Specific Pipeline

```bash
python3 pipelines/cli.py generate-airflow --pipeline my-pipeline
```

### Generated DAG Structure

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    'owner': 'team@summit.io',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    dag_id='my-pipeline',
    default_args=default_args,
    schedule_interval='0 2 * * *',
    start_date=datetime(2025, 1, 1),
)

# Tasks and dependencies auto-generated...
```

---

## RUNBOOKS to Pipelines

Convert operational runbooks into executable pipelines.

### Example Conversion

**Before (RUNBOOK):**
```yaml
# RUNBOOKS/ransomware-triage.yaml
- Step 1: Gather incident context
- Step 2: Identify patient zero
- Step 3: Map lateral movement
- Step 4: Generate containment plan
```

**After (Pipeline):**
```yaml
# pipelines/manifests/runbook-ransomware-triage.yaml
apiVersion: summit.io/v1
kind: Pipeline
metadata:
  name: ransomware-triage
  annotations:
    runbook: RUNBOOKS/ransomware-triage.yaml
spec:
  triggers:
    - type: manual
      config:
        required_approval: true
  tasks:
    - id: gather_context
      type: python
      code:
        module: jobs.incident_response
        function: gather_ransomware_context
    # ... additional tasks
```

Now the runbook is executable:

```bash
just pipelines-run ransomware-triage
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    Pipeline CLI                         │
│              (pipelines/cli.py)                         │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
     ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌──────────────┐
│Registry │   │  Local   │   │   Airflow    │
│  Core   │   │  Runner  │   │  Generator   │
└─────────┘   └──────────┘   └──────────────┘
     │               │               │
     │               │               │
     ▼               ▼               ▼
┌─────────────────────────────────────────────────────────┐
│            OpenLineage Event Emitter                    │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│         OpenLineage Server (Marquez)                    │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```
pipelines/
├── schema/
│   └── pipeline-manifest.schema.json   # JSON schema
├── manifests/
│   ├── intelligence-coordination-batch.yaml
│   ├── cisa-kev-ingest.yaml
│   ├── demo-hello-world.yaml
│   └── runbook-ransomware-triage.yaml
├── registry/
│   └── core.py                          # Pipeline registry
├── runners/
│   └── local_runner.py                  # Local execution engine
├── adaptors/
│   └── airflow_generator.py             # Airflow DAG generator
├── tests/
│   ├── test_registry.py
│   └── test_runner.py
├── demo/                                # Demo pipeline outputs
└── cli.py                               # CLI entry point
```

---

## Examples

### Example 1: Daily Intelligence Coordination

See `pipelines/manifests/intelligence-coordination-batch.yaml`

- **16 tasks** in parallel and sequential stages
- Multi-source ingestion (Twitter, YouTube, Reddit, etc.)
- Graph analytics (community detection, similarity)
- Anomaly detection (CUSUM, persona drift)
- Coordination scoring and case triggering

Run:
```bash
just pipelines-info intelligence-coordination-batch
just pipelines-graph intelligence-coordination-batch mermaid
```

### Example 2: CISA KEV Ingestion

See `pipelines/manifests/cisa-kev-ingest.yaml`

- Fetches CISA Known Exploited Vulnerabilities
- Transforms to graph format
- Loads into Neo4j with MERGE semantics
- Validates data quality

Run:
```bash
just pipelines-run cisa-kev-ingest
```

### Example 3: Demo Hello World

See `pipelines/manifests/demo-hello-world.yaml`

Simple end-to-end pipeline demonstrating:
- Multi-task dependencies
- Context propagation
- OpenLineage tracking
- Summary generation

Run:
```bash
just pipelines-run demo-hello-world
cat pipelines/demo/summary.txt
```

### Example 4: Ransomware Triage (from RUNBOOK)

See `pipelines/manifests/runbook-ransomware-triage.yaml`

Automated incident response workflow:
- Gather incident context
- Identify patient zero
- Map lateral movement
- Generate containment plan
- Execute containment actions

Run:
```bash
just pipelines-info ransomware-triage
```

---

## Testing

### Run Unit Tests

```bash
# Install pytest
pip install pytest pytest-cov pyyaml

# Run tests
pytest pipelines/tests/ -v

# With coverage
pytest pipelines/tests/ --cov=pipelines --cov-report=html
```

### Manual Testing

```bash
# Validate all manifests
just pipelines-validate

# Dry-run demo pipeline
python3 pipelines/cli.py run demo-hello-world --dry-run

# Run with custom context
python3 pipelines/cli.py run demo-hello-world --context '{"test": true}'
```

---

## Best Practices

### 1. Manifest Naming

Use kebab-case for pipeline names:
```yaml
metadata:
  name: my-pipeline-name  # ✅ Good
  name: MyPipelineName    # ❌ Bad
```

### 2. Task Naming

Use descriptive task IDs and names:
```yaml
tasks:
  - id: fetch_data         # ✅ Good
    name: Fetch User Data
  - id: t1                 # ❌ Bad
    name: Task 1
```

### 3. Ownership

Always specify owners:
```yaml
metadata:
  owners:
    - data-team@summit.io
```

### 4. Tags

Use consistent taxonomy:
```yaml
tags:
  domain: security | intelligence | data-engineering
  scope: etl | analytics | incident-response
  criticality: low | medium | high | critical
```

### 5. Inputs/Outputs

Document all data dependencies:
```yaml
spec:
  inputs:
    - name: source_data
      namespace: s3://bucket/path
  outputs:
    - name: processed_data
      namespace: neo4j://prod/table
```

### 6. Governance

Set budgets and SLOs:
```yaml
governance:
  budget:
    per_run_usd: 10.00
  slo:
    latency_p95_ms: 3600000
    success_rate_percent: 99.0
```

---

## Troubleshooting

### Pipeline Not Found

```bash
# List all registered pipelines
just pipelines-list

# Check if manifest is valid YAML
yamllint pipelines/manifests/my-pipeline.yaml
```

### Validation Errors

```bash
# Validate specific pipeline
python3 pipelines/cli.py validate --name my-pipeline

# Check for cycles
python3 pipelines/cli.py graph my-pipeline
```

### Task Failures

```bash
# Run with dry-run to check structure
python3 pipelines/cli.py run my-pipeline --dry-run

# Check logs for specific task errors
python3 pipelines/cli.py run my-pipeline 2>&1 | grep "ERROR"
```

### OpenLineage Not Working

```bash
# Check environment variables
echo $OPENLINEAGE_URL
echo $OPENLINEAGE_API_KEY

# Verify OpenLineage server is running
curl $OPENLINEAGE_URL/health
```

---

## Migration Guide

### From Airflow DAGs

1. Identify DAG file (e.g., `airflow/dags/my_dag.py`)
2. Extract task definitions and dependencies
3. Create pipeline manifest
4. Map Airflow operators to task types:
   - `PythonOperator` → `type: python`
   - `BashOperator` → `type: bash`
   - `DockerOperator` → `type: docker`
5. Validate and test locally
6. Generate new Airflow DAG from manifest

### From Maestro Workflows

Maestro workflows are largely compatible! Just add:
- `apiVersion: summit.io/v1`
- `kind: Pipeline`
- Ensure tasks follow new schema

### From RUNBOOKS

1. Identify runbook YAML
2. Convert steps to tasks
3. Add code references for each step
4. Wire dependencies
5. Test locally

---

## FAQ

**Q: Can I mix runtimes for different tasks?**
A: Currently, all tasks in a pipeline use the same runtime. Multi-runtime support is planned.

**Q: How do I schedule pipelines?**
A: Use the `spec.schedule.cron` field. For Airflow runtime, the schedule is automatically configured.

**Q: Can I trigger pipelines manually?**
A: Yes! Use `just pipelines-run PIPELINE_NAME` or set `triggers: [{type: manual}]`.

**Q: How do I pass parameters to a pipeline run?**
A: Use `--context` flag: `just pipelines-run my-pipeline '{"param": "value"}'`

**Q: Where are pipeline run results stored?**
A: Results are stored per-runtime. Local runs output to stdout/stderr. Check `pipelines/demo/` for demo output.

---

## Support

- **Issues**: File issues in the Summit repository
- **Documentation**: This guide + inline schema docs
- **Examples**: See `pipelines/manifests/` directory
- **Runbooks**: See `RUNBOOKS/` directory

---

## Changelog

### v1.0.0 (2025-01-20)

- ✅ Initial unified orchestration system
- ✅ Pipeline manifest schema v1
- ✅ Registry core with discovery and filtering
- ✅ Local runner with retry logic
- ✅ Airflow DAG generator
- ✅ OpenLineage integration
- ✅ CLI with comprehensive commands
- ✅ Just recipe integration
- ✅ Example pipelines (intelligence, CISA KEV, demo, runbook)
- ✅ Comprehensive tests
- ✅ Documentation

---

**Last Updated**: 2025-01-20
**Maintainer**: Summit Platform Team
**Version**: 1.0.0
