# Symphony CLI Reference

## Overview

The Symphony CLI (`tools/symphony.py`) provides a unified command palette for IntelGraph platform operations with built-in routing, autonomy controls, and safety caps.

## Command Grammar

```bash
symphony <noun> <verb> [options]
```

### Nouns (Resource Types)
- `source` - Data sources and ingestion
- `pipeline` - Orchestration workflows  
- `graph` - Graph database operations
- `orchestrator` - System coordination
- `policy` - Configuration and governance

### Common Verbs
- `list` - Show available resources
- `status` - Display current state
- `run` - Execute operations
- `show` - Display configuration
- `tune` - Modify settings

## Global Options

- `--dry-run` - Show what would be done without executing
- `--explain` - Provide detailed explanation of actions
- `--json` - Output results in JSON format
- `--autonomy LEVEL` - Override autonomy level (0-3)

## Commands

### Source Operations

#### List Sources
```bash
symphony source list
```

#### Source Status
```bash
symphony source status
```

#### Refresh RAG Knowledge
```bash
symphony source refresh
symphony source refresh --dry-run
```

### Pipeline Operations

#### Run Full Orchestra
```bash
symphony pipeline run
symphony pipeline run --target orchestra-fast
```

#### Run Smoke Test
```bash
symphony pipeline run --smoke
```

#### Pipeline Status
```bash
symphony pipeline status
```

### Graph Operations

#### Natural Language to Cypher
```bash
symphony graph query --query "Find all entities connected to user Alice"
```

#### Graph Status
```bash
symphony graph status
```

#### Run Neo4j Guard (Migrations)
```bash
symphony graph guard
symphony graph guard --dry-run
```

### Orchestrator Operations

#### System Status
```bash
symphony orchestrator status
```

#### Tune Autonomy
```bash
symphony orchestrator tune --autonomy 2
```

### Policy Operations

#### Show Current Policy
```bash
symphony policy show
```

#### Tune Policy
```bash
symphony policy tune --autonomy 1
```

## Configuration

### Environment Variables
Set in `.orchestra.env`:

```bash
PROFILE=dev
AUTONOMY=1
RAG_TOPK=5
MODEL_GENERAL=local/llama
MODEL_CODE=local/llama-cpu
MODEL_GRAPH=local/llama
```

### YAML Configuration
Define in `orchestration.yml`:

```yaml
defaults:
  model_general: local/llama
  model_code: local/llama-cpu
  autonomy: 1
  temperature: 0.2

routes:
  - when: { task: "code" }
    then: { model: local/llama-cpu, temperature: 0.1 }
```

## Autonomy Levels

### LOA-0: Manual Only
```bash
symphony pipeline run --autonomy 0  # Shows plan only
```

### LOA-1: Suggest + Confirm (Default)
```bash
symphony pipeline run  # Asks for confirmation
```

### LOA-2: Auto-Local
```bash
symphony pipeline run --autonomy 2  # Executes automatically
```

### LOA-3: Auto + Bursts
```bash
symphony pipeline run --autonomy 3  # Allows higher resource usage
```

## Smart Routing

### Automatic Model Selection
- **Code tasks**: Routes to `local/llama-cpu`
- **Graph queries**: Routes to `local/llama`
- **General tasks**: Routes to `local/llama`

### Task Detection
Based on:
- Command context (`graph query` → graph model)
- File patterns (`**/*.py` → code model)
- Explicit task flags

## Safety Features

### Cost Caps
- Daily spending limits
- Per-request token limits
- Timeout controls

### Confirmation Gates
- High-cost operations
- External model usage
- LOA-3 operations

### Dry Run Mode
```bash
symphony <any-command> --dry-run
```
Shows exactly what would happen without executing.

## Examples

### Complete Workflow
```bash
# Check system status
symphony orchestrator status

# Run smoke test
symphony pipeline run --smoke

# Query graph with natural language
symphony graph query --query "Show me recent connections to sensitive data"

# Create backup
symphony orchestrator backup
```

### Development Workflow
```bash
# Set to development mode
echo "PROFILE=dev" >> .orchestra.env
echo "AUTONOMY=1" >> .orchestra.env

# Check policy
symphony policy show

# Refresh knowledge base
symphony source refresh --dry-run
symphony source refresh

# Quick health check
symphony pipeline run --fast
```

### Production Workflow
```bash
# Set production safety
echo "PROFILE=prod" >> .orchestra.env 
echo "AUTONOMY=0" >> .orchestra.env

# Manual execution only
symphony pipeline run --dry-run
# Review output, then:
symphony pipeline run
```

## Error Handling

### Command Failed
Check logs and try with `--explain`:
```bash
symphony pipeline run --explain
```

### Model Unavailable
Check services:
```bash
symphony orchestrator status
```

### Permission Denied
Check autonomy level:
```bash
symphony policy show
symphony policy tune --autonomy 1
```

## Extension

### Adding Commands
Edit `tools/symphony.py` and add methods:

```python
def cmd_mycmd(self, verb: str, **kwargs):
    if verb == "myverb":
        # Implementation
        pass
```

### Custom Routing
Modify routing rules in `orchestration.yml`:

```yaml
routes:
  - when: { task: "mytask" }
    then: { model: mymodel, temperature: 0.5 }
```
