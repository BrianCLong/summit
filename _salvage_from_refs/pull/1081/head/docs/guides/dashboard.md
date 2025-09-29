# Dashboard Guide

## Overview

The Symphony Dashboard provides real-time visibility into your IntelGraph platform with one-click orchestration capabilities.

## Getting Started

### 1. Generate Status Data
```bash
just dash-refresh
```

### 2. Start Dashboard
```bash
just dash-open  # Opens browser automatically
```

### 3. Stop Dashboard
```bash
just dash-stop
```

## Features

### 🎵 Services Status
- **Ollama** (:11434) - Local AI model server
- **LiteLLM** (:4000) - Model gateway and proxy
- **Neo4j** (ephemeral) - Graph database for testing

### 🤖 AI Models
- Live model discovery from LiteLLM gateway
- Model count and availability
- Quick access to model routing

### 📚 RAG Knowledge
- Document count in RAG index
- Unique file count
- Knowledge base health

### ⚡ Quick Actions
- **Smoke Test**: End-to-end validation
- **Status**: Generate fresh status
- **Health**: Fast health check
- **Backup**: Create system snapshot

## Dashboard Modes

### Direct Mode (Default)
Connects directly to services on localhost. Works for status viewing.

### Proxy Mode (Recommended)
Connects through local proxy for full functionality:

1. Start proxy:
   ```bash
   node tools/proxy.js
   ```

2. Switch to "Local Proxy" mode in dashboard

3. Quick Actions now work with safe command execution

## Configuration

### Environment Display
Dashboard shows current configuration:
- **Profile**: dev/staging/prod
- **LOA**: Level of Autonomy (0-3)
- **RAG-K**: Top-K results for RAG queries

### Auto-Refresh
Dashboard auto-refreshes every 30 seconds. Click "Refresh" for immediate update.

## Troubleshooting

### "No status.json yet"
```bash
just dash-refresh
```

### Services showing offline
```bash
just --justfile Justfile.ai ai-up
just --justfile Justfile.neo4j neo4j-up
```

### Quick Actions not working
Start the proxy:
```bash
node tools/proxy.js
```

Then switch dashboard to "Local Proxy" mode.

## Advanced Usage

### Custom Status Data
Modify `tools/status_json.py` to add custom metrics:

```python
status["custom"] = {
    "your_metric": get_your_data(),
    "timestamp": datetime.now().isoformat()
}
```

### Dashboard Customization
Edit `dashboard/index.html` to add:
- Custom cards
- Additional metrics
- New quick actions
- Styling changes

### Proxy Commands
Add allowed commands in `tools/proxy.js`:

```javascript
const ALLOWED_COMMANDS = [
    'your-custom-command',
    // ... existing commands
];
```
