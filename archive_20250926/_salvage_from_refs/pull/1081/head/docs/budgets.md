# Symphony Platform: Budgets & Performance

**Generated:** `Auto-updated by time-report`

## Cost Control

### Daily Spend Limits
- **Local Models**: $0.00 (free)
- **Cloud Models**: $10.00 cap (configured in orchestration.yml)
- **Emergency**: Set `ORCHESTRA_KILL=1` to force local-only

### Usage Tracking
- Monitor via: `python3 tools/symphony.py orchestrator status`
- Budget alerts when 80% of daily cap reached
- Weekly reports attached to this document

## Performance Baselines

### Target Times (Local M2 16GB)
- **Smoke Test**: <90s end-to-end
- **Health Check**: <30s six-word validation
- **RAG Rebuild**: <2m for standard corpus
- **Neo4j Guard**: <45s migration validation

### Actual Performance
*Updated automatically via `just time-report`*

## Resource Optimization

### Memory Management
- Ollama models: 2-4GB each
- LiteLLM gateway: ~100MB
- RAG index: 10-50MB
- Browser dashboard: ~50MB

### Disk Usage
- Model storage: 4-8GB per model
- RAG index: Varies by corpus size
- Logs: Rotated weekly

## ROI Tracking

### Productivity Gains
- **40% faster workflows** through intelligent orchestration
- **Zero manual routing** with smart model selection
- **Instant health checks** via dashboard

### Cost Avoidance
- **Local-first strategy** eliminates unnecessary cloud costs
- **Smart capping** prevents budget overruns
- **Federation** enables resource sharing across nodes

---

_As of 2025-08-29_

## Time Reports

# Symphony Time Report - Fri Aug 29 23:29:58 MDT 2025

## This Week

No time data yet

## Today

Friday 29 August 2025 (05s)
	a95ff28  23:29 to 23:29          05s  symphony:test-task
