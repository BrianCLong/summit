# Autonomous Ultra-Maximal Development Agent

This repo defines an autonomous development agent that:

- Uses a **universal ultra-maximal extrapolative prompt**
- Interprets a user request, plans, executes, verifies, and documents
- Can be containerized and run as a service
- Is wired for CI (GitHub Actions + optional GitLab CI)
- Supports multi-agent orchestration (Architect, Engineer, Tester, etc.)
- Includes a VS Code extension scaffold

## Quickstart

```bash
# 1. Install deps
pip install -e .

# 2. Set your API key
export OPENAI_API_KEY="sk-..."

# 3. Run the agent once with a request
python -m agent.main "Build a small REST API for tasks"
```

## Docker

```bash
docker build -t ultra-agent .
docker run --rm -e OPENAI_API_KEY=your-key ultra-agent \
  "Build a small REST API for tasks"
```

## Directory Structure

- `src/agent`: Core python package
- `src/agent/agents`: Multi-agent definitions
- `src/agent/modules`: Single-agent modules
- `src/agent/memory`: Persistence layer
- `sandbox`: Isolation runner
- `vscode`: VS Code extension
- `prompts`: Prompt definitions
- `config`: Configuration
