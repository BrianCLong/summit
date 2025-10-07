---
title: Summit UI (Static)
emoji: 🛰️
sdk: static
app_file: index.html
pinned: false
---

# Summit UI (Static Space)

A minimal React UI that calls a **remote GraphQL API** (set in `config.json`).

## Configure

Edit `config.json` to point at your backend:

```json
{ "apiBase": "https://your-remote-host.example.com" }
```

One-liner: create Space + push

```bash
USER="BrianCLong" SPACE="summit-ui-static" && \
huggingface-cli repo create "$SPACE" --type space -y || true && \
git init && git add . && git commit -m "init static ui space" && git branch -M main && \
git remote add origin "https://huggingface.co/spaces/$USER/$SPACE" 2>/dev/null || git remote set-url origin "https://huggingface.co/spaces/$USER/$SPACE" && \
git push -u origin main
```

This is a Static Space: no server-side code runs here. Point apiBase to any HTTPS endpoint you control.

```

```
