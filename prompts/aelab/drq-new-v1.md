---
id: aelab-drq-new
version: v1
owner: codex
last_updated: 2026-01-15
---

Create a new toy candidate JSON object with an "ops" array. Allowed ops:
- {"type":"lower"}
- {"type":"upper"}
- {"type":"append","value":"a"}
- {"type":"prepend","value":"a"}
- {"type":"replace","from":"a","to":"e"}
- {"type":"truncate","length":3}
Constraints: max 6 ops, values <= 8 chars.
Return only JSON.
