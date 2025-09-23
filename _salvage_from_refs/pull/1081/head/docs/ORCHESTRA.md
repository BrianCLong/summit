# 🎼 IntelGraph Symphony Orchestra v1.0

**Production-Ready AI Orchestration Platform**

*Complete AI development orchestration with autonomous routing, policy enforcement, and federation capabilities*

## Quick Start (30 seconds)

```bash
# 1. Start AI stack
just ai-up

# 2. Test with six-word ping
bash tools/ai_ask6.sh local/llama 'return exactly six words'

# 3. Build RAG index and query
just rag-rebuild
just rag q='what is IntelGraph?'

# 4. Test Neo4j guard
just neo4j-guard
```

## System Overview

The IntelGraph AI Symphony Orchestra provides **unified, local-first AI orchestration** with optional power bursts to hosted services. Everything routes through a single LiteLLM gateway for cost control and consistency.

### Architecture

```
┌─────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   VS Code   │ │    Terminal     │ │   Browser AI    │
│ (Continue)  │ │ (Aider, CLI)    │ │ (Perplexity,    │
│             │ │                 │ │  Claude, etc.)  │
└─────┬───────┘ └─────────┬───────┘ └─────────┬───────┘
      │                   │                   │
      │         OpenAI-compatible API         │
      │                   │                   │
      └───────────┬───────┴───────────────────┘
                  v
    ┌─────────────────────────────────────────────┐
    │           LiteLLM Gateway :4000             │
    │     • Local-first routing                   │
    │     • Budget controls                       │
    │     • Fallback models                       │
    └─────────────┬───────────────────────────────┘
                  │
      ┌───────────┴──────────────┬──────────────────┐
      v                          v                  v
┌─────────────┐        ┌─────────────────┐  ┌─────────────┐
│Local Models │        │  RAG System     │  │Browser AI   │
│• Qwen Coder │        │  • DuckDB       │  │• Perplexity │
│• Llama 3.1  │        │  • Embeddings   │  │• Claude     │
│• DeepSeek   │        │  • Semantic     │  │• Gemini     │
└─────────────┘        └─────────────────┘  └─────────────┘
```

## Agent Roles System

The Orchestra includes specialized AI agents for different development roles:

| Agent | Model Route | Purpose | Example Usage |
|-------|-------------|---------|---------------|
| **Guy** (Architect) | `local/llama` | Design decisions, code quality | `aider --model openai/local/llama` |
| **Elara** (Research) | `gemini/1.5-pro` | Context gathering, analysis | Research with `just elara-research q='topic'` |
| **Aegis** (Security) | `local/llama-cpu` | Security review, compliance | `just aegis-research q='security topic'` |
| **Orion** (Data/Graph) | `local/llama` | Neo4j, Cypher, data flows | `just orion-research q='graph query'` |
| **Hermes** (CI/CD) | `local/llama-small` | Deployments, automation | `just hermes-research q='deployment'` |

## Core Commands

### AI Stack Management
```bash
# Start/stop local AI infrastructure
just ai-up                    # Start LiteLLM gateway
just ai-down                  # Stop gateway
just ai-ping                  # Test all models
just ollama-up                # Start Ollama service
just health                   # Complete health check
```

### RAG System
```bash
# Enhanced RAG with DuckDB backend
just rag-ingest docs/ pm/     # Index multiple directories  
just rag q='query here'       # Semantic search + answer
just rag-search q='query'     # Search only (no LLM answer)
just rag-stats                # Database statistics
just rag-files                # List indexed files

# Specialized queries
just pmi-query q='governance'  # Query PMI docs only
just agent-query q='prompts'   # Query agent roles
```

### Neo4j Guard System
```bash
# Safe migration testing
just neo4j-guard              # Run migrations (enhanced)
just neo4j-guard-keep         # Keep DB for inspection
just neo4j-health             # Check system status
just neo4j-smoke-test         # Quick connectivity test
```

### Browser AI Integration  
```bash
# Multi-tool research workflows
just research q='topic'       # Open research tools
just px q='quick question'    # Perplexity search
just claude q='complex task'  # Claude.ai
just all-ai q='hard problem' # Open all major AI tools

# Agent-specific browser research  
just guy-research q='arch'    # Architecture research
just elara-research q='data'  # Deep research
just aegis-research q='sec'   # Security research
```

### PMI Governance
```bash
# Project management automation
python3 tools/agenda_build.py    # Generate meeting agendas
python3 tools/raci_from_codeowners.py  # Update RACI matrix
```

## Configuration Files

### Core Configs
- `litellm.config.yaml` - AI routing and budgets
- `.aider.conf.yml` - Aider agent integration  
- `~/.continue/config.json` - VS Code Continue.dev
- `docker-compose.neo4j.yml` - Ephemeral Neo4j

### Standards & Quality
- `.editorconfig` - Consistent file formatting
- `eslint.config.js` - JavaScript/TypeScript linting
- `.prettierrc.json` - Code formatting
- `pyproject.toml` - Python tools (Black, Ruff)
- `.pre-commit-config.yaml` - Git hooks

## Troubleshooting

### Common Mac M2 Issues

| Problem | Solution |
|---------|----------|
| **Ollama won't start** | `launchctl load ~/Library/LaunchAgents/com.ollama.ollama-serve.plist` |
| **Docker not found** | Start Docker Desktop, ensure in PATH |
| **Port 4000 busy** | `lsof -ti:4000 \| xargs kill -9` |
| **Vector dimension error** | Use `FLOAT[768]` not `VECTOR` in DuckDB |
| **Memory issues** | Use `local/llama-small` or `local/llama-cpu` |
| **Permission denied** | `chmod +x tools/*.sh` |

### Performance Tips (16GB RAM)

✅ **DO**
- Use `local/llama-small` for quick tasks
- Limit RAG context to 5 results max  
- Keep Ollama models to 2-3 active
- Use `just ollama-kill` between sessions
- Monitor Activity Monitor during heavy use

❌ **DON'T**
- Run multiple large models simultaneously
- Use hosted APIs for bulk operations
- Keep browser research tools open indefinitely
- Chain complex RAG queries without breaks

### Service Health Checks

```bash
# Quick diagnostics
curl -s http://127.0.0.1:4000/v1/models | jq    # LiteLLM
curl -s http://127.0.0.1:11434/api/tags | jq    # Ollama  
docker ps --filter name=neo4j-ephemeral         # Neo4j
ls -la rag/index/rag.duckdb                     # RAG DB

# Comprehensive health check
just health
```

## Advanced Workflows

### Semi-Autonomous Development Loop

```bash
# 1. Plan with Guy (Architect)
just plan "implement user authentication"

# 2. Research with Elara  
just elara-research q="authentication best practices OWASP"

# 3. Prototype with local coder
just prototype server/auth/*.ts

# 4. Security review with Aegis
just aegis server/auth/

# 5. Test with Neo4j guard
echo "CREATE (:User {id: 'test'})" > db/migrations/auth_test.cypher
just neo4j-guard

# 6. Document and commit
just hermes  # Generate PR description
```

### Research & Context Workflow

```bash
# Hybrid local + external research
just research q="GraphQL subscription performance"

# Deep research with multiple tools
just research-deep q="real-time collaboration architectures" 

# Compare local knowledge vs external
just compare-knowledge q="Neo4j indexing strategies"
```

## Power Burst Configuration

To enable hosted API access, uncomment in `litellm.config.yaml`:

```yaml
# Uncomment and set environment variables
- model_name: gemini/1.5-pro
  litellm_params:
    custom_llm_provider: gemini
    api_key: "${GOOGLE_API_KEY}"

budget:
  model:
    gemini/1.5-pro: 0.20  # $0.20/day cap
```

Then set environment variables:
```bash
export GOOGLE_API_KEY="your-key-here"
export XAI_API_KEY="your-grok-key"  # optional
```

## System Resources

### Memory Usage (typical)
- **Ollama + 1 model**: 2-4GB
- **LiteLLM Gateway**: 50-100MB  
- **RAG DuckDB**: 10-50MB
- **Neo4j ephemeral**: 512MB
- **Browser tools**: 200MB per tab

### Disk Usage
- **Ollama models**: 4-8GB each
- **RAG index**: 10-100MB depending on corpus
- **Docker images**: ~500MB total

## Getting Help

### Documentation
- `just --list` - Show all available commands
- `just browser-list` - Show browser AI tools
- `just rag-files` - Show indexed documentation  
- View `prompts/*.md` for agent role details

### Quick Reference
```bash
# Most common workflows
just health              # Check everything
just rag q='help'        # Query local docs
just px q='quick help'   # External search
just research q='topic'  # Full research workflow
```

### Emergency Reset
```bash
# If everything breaks
just ollama-kill && just ai-down && just neo4j-clean
docker system prune -f
just ai-up && just rag-rebuild
```

---

**🎼 That's your IntelGraph AI Symphony Orchestra! One gateway, many brains, infinite possibilities.**

*For detailed configuration and advanced usage, see individual Justfiles and the `tools/` directory.*