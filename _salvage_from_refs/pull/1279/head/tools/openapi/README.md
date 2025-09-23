# OpenAPI Mock (Prism)

Mock the Export API using Prism.

Requirements:
- Node.js + npm
- `npm i -g @stoplight/prism-cli`

Run:
```
PORT=4010 tools/openapi/mock.sh openapi/export.yaml
```

Then call:
```
curl -s http://127.0.0.1:4010/export/simulate -X POST \
  -H 'Content-Type: application/json' \
  -d '{"action":"export","auth":{"webauthn_verified":true},"resource":{"sensitivity":"Internal"}}' | jq .
```

