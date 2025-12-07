# Autonomous Ultra-Maximal Development Agent

This repo defines an autonomous development agent that:

- Uses a **universal ultra-maximal extrapolative prompt**
- Interprets a user request, plans, executes, verifies, and documents
- Can be containerized and run as a service
- Is wired for CI (GitHub Actions + optional GitLab CI)

## Quickstart

```bash
# 1. Install deps
pip install -e .

# 2. Set your API key (example: OpenAI-style)
export OPENAI_API_KEY="sk-..."

# 3. Run the agent once with a request
python -m agent.main "Build a small REST API for tasks"
```

Or via Docker:

```bash
docker build -t ultra-agent .
docker run --rm -e OPENAI_API_KEY=your-key ultra-agent \
  "Build a small REST API for tasks"
```

See `prompts/PROMPTS.md` and `config/agent-config.yaml` for full behavior.
