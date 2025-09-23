# IntelGraph AI Symphony Orchestra - Operations Runbook

**Complete operational procedures for managing the IntelGraph AI development orchestration system**

## Emergency Procedures

### 🚨 System Down - Complete Reset

If everything is broken and you need to get back to working state:

```bash
# 1. Kill all services
just ollama-kill
just ai-down  
just neo4j-clean
pkill -f litellm || true

# 2. Clean up Docker
docker system prune -f

# 3. Restart core services
just ollama-up
sleep 5
just ai-up

# 4. Verify system
just health
```

### 🔥 Out of Memory - Emergency Cleanup

When the Mac M2 16GB RAM is exhausted:

```bash
# 1. Immediate relief
just ollama-kill
just models-reset  # Removes non-essential models

# 2. Close browser AI tabs
# Use Activity Monitor to kill heavy Chrome/Safari tabs

# 3. Clean up processes
ps aux | grep -E "(ollama|litellm|python)" | awk '{print $2}' | xargs kill -9 || true

# 4. Restart with minimal setup
just ollama-up
just models-ensure-intelgraph
just ai-up
```

### 💾 Out of Disk Space

When storage is full:

```bash
# 1. Quick cleanup
just models-cleanup
docker system prune -af --volumes

# 2. Clean development artifacts
rm -rf node_modules/.cache
rm -rf **/.vite
rm -rf **/dist
rm -rf **/build

# 3. Clean RAG database if too large
rm -f rag/index/rag.duckdb
just rag-rebuild

# 4. Emergency model removal (keep only essentials)
just models-reset
```

## Daily Operations

### Morning Startup Routine

```bash
# 1. Health check
just health

# 2. Start services if needed
just ai-up

# 3. Update models (weekly)
just models-daily

# 4. RAG maintenance
just rag-stats

# 5. Check for system updates
git status
git pull origin main || true
```

### Development Session Setup

```bash
# 1. Pre-flight check
just models-preflight

# 2. Start development stack
just ollama-up
just ai-up

# 3. Verify agent access
aider --model openai/local/llama --message "Hello from Guy"

# 4. Test RAG system
just rag q='what is my current project status?'

# 5. Open browser AI tools if needed
just px q='good morning, what should I work on today?'
```

### End of Day Shutdown

```bash
# 1. Commit work
git add . && git status

# 2. Clean up resources
just ollama-kill  # Saves memory
# just ai-down    # Optional - keeps gateway for next day

# 3. RAG maintenance if corpus updated
just rag-rebuild  # Only if docs changed

# 4. Check for updates needed
just models-health | grep -i recommend || echo "All good"
```

## Weekly Maintenance

### Full System Maintenance (Sundays)

```bash
#!/usr/bin/env bash
echo "🗓️ Weekly IntelGraph AI Symphony Maintenance"

# 1. Update all models
just models-weekly

# 2. Update system dependencies  
git pull origin main
npm install || true
pip install -r requirements-dev.txt || true

# 3. RAG system maintenance
just rag-rebuild
just rag-stats

# 4. Neo4j guard testing
just neo4j-guard

# 5. Browser AI tools health check
just browser-test

# 6. PMI governance updates
python3 tools/raci_from_codeowners.py
python3 tools/agenda_build.py

# 7. Clean up old files
find . -name "*.log" -mtime +7 -delete || true
find . -name "*.tmp" -delete || true

echo "✅ Weekly maintenance complete"
```

## Troubleshooting Guide

### Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Ollama not responding** | `ollama list` fails | `launchctl load ~/Library/LaunchAgents/com.ollama.ollama-serve.plist` |
| **LiteLLM down** | Port 4000 not responding | `just ai-down && just ai-up` |
| **Memory exhausted** | System sluggish, high memory usage | `just ollama-kill && just models-reset` |
| **Model download stuck** | Downloads hang indefinitely | Ctrl+C, then `ollama pull model-name` manually |
| **RAG queries failing** | Empty results or errors | `just rag-rebuild` |
| **Neo4j guard errors** | Docker or database issues | `just neo4j-clean && just neo4j-up` |
| **Browser tools not working** | URLs don't open | Check default browser settings |
| **Aider not connecting** | Cannot reach models | Check `.aider.conf.yml` and LiteLLM status |

### Debugging Commands

```bash
# System diagnostics
just health                    # Overall health
just models-health            # Model ecosystem
just rag-stats               # RAG system
just neo4j-health            # Neo4j status
just browser-context         # Git and project context

# Network diagnostics  
curl -s http://127.0.0.1:11434/api/tags | jq    # Ollama API
curl -s http://127.0.0.1:4000/v1/models | jq    # LiteLLM gateway
curl -s http://127.0.0.1:4000/health             # Gateway health

# Resource monitoring
just models-resources         # Current resources
just models-monitor          # Live monitoring (Ctrl+C to stop)
top -pid $(pgrep -f ollama)   # Ollama process monitoring
```

### Log Locations

```bash
# System logs
tail -f ~/.ollama/logs/server.log    # Ollama server
tail -f /var/log/system.log | grep ollama  # System logs (macOS)

# Application logs  
ls -la *.log                         # Local application logs
docker logs neo4j-ephemeral         # Neo4j container logs

# Debug mode
VERBOSE=1 just ai-up                 # Verbose startup
DEBUG=1 python3 tools/model_manager.py health  # Debug model manager
```

## Performance Optimization

### Memory Optimization (16GB Mac M2)

```bash
# 1. Use smaller models for routine tasks
export AIDER_MODEL="openai/local/llama-small"

# 2. Limit concurrent operations
# Don't run multiple heavy browser AI sessions
# Use one Aider session at a time
# Close RAG queries between major operations

# 3. Model swapping strategy
just models-cleanup-dry  # Check what can be removed
# Keep only: qwen2.5-coder:7b, llama3.1:8b, nomic-embed-text

# 4. RAG optimization
just rag-ingest docs/ pm/ --chunk-size 600  # Smaller chunks
```

### Disk Space Management

```bash
# 1. Regular cleanup
just models-cleanup      # Weekly
docker system prune -f  # Weekly  
rm -rf node_modules/.cache  # After npm operations

# 2. RAG database optimization
du -h rag/index/rag.duckdb  # Check size
# If > 100MB, consider reducing corpus or chunk size

# 3. Model storage optimization  
ollama list | awk '{print $1 " " $3}' | sort -k2 -hr  # Models by size
# Remove largest unused models first
```

### Network & API Optimization

```bash
# 1. LiteLLM optimization
# Edit litellm.config.yaml:
# - Increase timeout for slow models
# - Add more fallback models
# - Use local models for bulk operations

# 2. Browser AI optimization
# Batch multiple queries instead of opening many tabs
just research q='topic1 AND topic2 AND topic3'

# 3. RAG optimization
just rag-ingest --patterns "*.md" "*.txt"  # Limit file types
```

## Monitoring & Alerting

### Health Check Automation

Create `~/.zshrc` or `~/.bashrc` addition:

```bash
# IntelGraph AI Symphony daily check
intelgraph_daily_check() {
    echo "🔍 IntelGraph Daily Check"
    cd /path/to/intelgraph  # Update this path
    
    # Quick health check
    if ! just health &>/dev/null; then
        echo "⚠️ IntelGraph AI Symphony needs attention"
        just health
    else
        echo "✅ All systems operational"
    fi
}

# Run daily check on terminal startup (once per day)
if [[ -f ~/.last_intelgraph_check ]]; then
    if [[ $(find ~/.last_intelgraph_check -mtime +1) ]]; then
        intelgraph_daily_check
        touch ~/.last_intelgraph_check
    fi
else
    touch ~/.last_intelgraph_check
fi
```

### Resource Monitoring Script

```bash
#!/usr/bin/env bash
# Save as tools/monitor.sh and run with: bash tools/monitor.sh

while true; do
    clear
    echo "IntelGraph AI Symphony - Live Monitor"
    echo "====================================="
    date
    echo
    
    # System resources
    echo "💻 System Resources:"
    echo "  Memory: $(python3 -c 'import psutil; print(f"{psutil.virtual_memory().percent}% used")')"
    echo "  Disk: $(df -BG . | tail -1 | awk '{print $5 " used, " $4 " available"}')"
    echo
    
    # Services status
    echo "🚀 Services:"
    echo "  Ollama: $(ollama list &>/dev/null && echo '✅' || echo '❌')"
    echo "  LiteLLM: $(curl -s http://127.0.0.1:4000/health &>/dev/null && echo '✅' || echo '❌')"
    echo "  Neo4j: $(docker ps --filter name=neo4j-ephemeral --format '{{.Status}}' 2>/dev/null || echo 'Not running')"
    echo
    
    # Active models
    echo "🤖 Active Models:"
    ollama list | head -5
    
    sleep 10
done
```

## Integration Workflows  

### Git Hooks Integration

Create `.git/hooks/post-commit`:

```bash
#!/usr/bin/env bash
# Auto-update RAG when documentation changes

# Check if docs or PM files changed
if git diff-tree --name-only --no-commit-id HEAD | grep -E "(docs/|pm/|README|\.md$)" &>/dev/null; then
    echo "📚 Documentation changed - updating RAG index..."
    cd "$(git rev-parse --show-toplevel)"
    just rag-ingest docs/ pm/ --stats || true
fi
```

### VS Code Integration

Add to VS Code `settings.json`:

```json
{
  "terminal.integrated.profiles.osx": {
    "IntelGraph AI": {
      "path": "/bin/zsh",
      "args": ["-c", "cd /path/to/intelgraph && exec zsh"]
    }
  },
  "terminal.integrated.defaultProfile.osx": "IntelGraph AI"
}
```

## Security & Backup

### Backup Procedures

```bash
# 1. Configuration backup
tar -czf backup-configs-$(date +%Y%m%d).tar.gz \
  .aider.conf.yml \
  litellm.config.yaml \
  tools/models.json \
  ~/.continue/config.json

# 2. RAG database backup  
cp rag/index/rag.duckdb rag/index/rag-backup-$(date +%Y%m%d).duckdb

# 3. PMI data backup
tar -czf backup-pmi-$(date +%Y%m%d).tar.gz pm/

# 4. Upload to secure location (customize)
# rsync backups to external drive or cloud storage
```

### Security Considerations

```bash
# 1. API key management
# Never commit API keys to git
echo "GOOGLE_API_KEY=your-key" >> .env
echo ".env" >> .gitignore

# 2. Model security
# Only use trusted model sources
# Verify model checksums when possible
ollama list | grep -v "ollama.com" && echo "⚠️ External models detected"

# 3. Network security  
# LiteLLM only listens on localhost
netstat -an | grep :4000 | grep -v 127.0.0.1 && echo "⚠️ External access detected"

# 4. Data protection
# RAG database contains project information
chmod 600 rag/index/rag.duckdb
```

---

## Quick Reference Card

### Most Common Commands
```bash
just health          # Check everything
just ai-up           # Start AI stack  
just rag q='...'     # Query knowledge base
just px q='...'      # Browser research
just models-list     # Show model status
just neo4j-guard     # Test migrations
```

### Emergency Reset
```bash
just ollama-kill && just ai-down && just neo4j-clean
just ai-up && just models-ensure-intelgraph
```

### Weekly Maintenance  
```bash
just models-weekly && just rag-rebuild && just neo4j-guard
```

**📞 Need Help?** Run `just --list` to see all available commands, or check `docs/ORCHESTRA.md` for the main overview.

---

*This runbook should be updated as the system evolves. Last updated: 2025-01-20*