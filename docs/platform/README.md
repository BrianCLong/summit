# IntelGraph Symphony Platform

🎼 **Orchestra-class coordination for AI-augmented intelligence analysis**

## Quick Start

### 10-Minute Setup

1. **Clone & Dependencies**

   ```bash
   git clone <repo>
   cd summit
   # Install dependencies per README
   ```

2. **Start the Orchestra**

   ```bash
   just --justfile Justfile.orchestra orchestra
   ```

3. **Open the Dashboard**

   ```bash
   just dash-refresh && just dash-open
   ```

4. **CLI Quick Test**
   ```bash
   python3 tools/symphony.py policy show
   python3 tools/symphony.py pipeline run --smoke
   ```

## Architecture

### The Symphony Metaphor

- **🎼 Conductor** (orchestrator): Routes tasks, enforces policies, manages autonomy levels
- **🎵 Score** (contracts/specs): API definitions, schemas, routing rules
- **🎻 Instruments** (services): AI models, RAG, graph DB, extraction engines
- **🎶 Rehearsal** (staging/sandboxes): Safe spaces for experimentation
- **🔊 Soundcheck** (tests): Validation, smoke tests, health checks
- **🎚️ Tuner** (config): Autonomy levels, model routing, caps
- **⏱️ Metronome** (cadence): Regular sync, releases, reviews

### Core Components

- **Browser Dashboard**: Real-time status, one-click actions, visual orchestration
- **CLI (Symphony)**: Unified command palette with routing and autonomy
- **Smart Routing**: Task-aware model selection with cost caps
- **LOA Engine**: Level of Autonomy (0-5) with safety guardrails
- **Observability**: Structured logs, metrics, traces, dashboards

## Concepts

### Level of Autonomy (LOA)

- **LOA-0**: Manual only (no auto-actions)
- **LOA-1**: Suggest only; human executes ✅ _Default_
- **LOA-2**: Auto in sandbox; requires human promote
- **LOA-3**: Auto with guardrails (caps) + notify
- **LOA-4**: Auto + rollback on anomaly; periodic human review
- **LOA-5**: Fully autonomous within policy + post-hoc audit

### Smart Routing

Tasks automatically route to appropriate models:

- **Code tasks** → `local/llama-cpu` (faster, code-optimized)
- **Graph queries** → `local/llama` (reasoning-focused)
- **High-risk operations** → External models with confirmation

### Cost & Safety Caps

- **Daily budgets**: Prevent runaway costs
- **Per-request limits**: Cap token usage
- **Timeout controls**: Prevent hanging operations
- **Confirmation gates**: Human approval for high-impact actions

## Next Steps

- [Configuration Guide](../guides/configuration.md)
- [CLI Reference](../reference/symphony-cli.md)
- [Dashboard Guide](../guides/dashboard.md)
- [Deployment Playbook](../playbooks/deployment.md)
