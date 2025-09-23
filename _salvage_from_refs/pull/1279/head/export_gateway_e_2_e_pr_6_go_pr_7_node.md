# Export Gateway — End‑to‑End Wiring

Two implementation PRs that expose **/export/simulate** and **/export** and return the OPA **decision payload** exactly as specified. Go version evaluates Rego in‑process; Node version shells to `opa eval` for simplicity.

---

## PR 6 — feat(service): **export‑gateway (Go, in‑process Rego)**
**Branch:** `feat/service-export-gateway-go`

### What’s included
- Go HTTP service exposing `/export/simulate` and `/export`.
- Uses `github.com/open-policy-agent/opa/rego` to evaluate **policies/export.rego**.
- Hot‑reload on SIGHUP.
- Table tests via `httptest`.
- Dockerfile; GitHub Actions CI.

### Patch (unified diff)
```diff
*** Begin Patch
*** Add File: services/export-gateway-go/go.mod
+module intelgraph/services/export-gateway-go
+
+go 1.22
+
+require github.com/open-policy-agent/opa v0.70.0
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/export-gateway-go/main.go
+package main
+
+import (
+    "context"
+    "encoding/json"
+    "log"
+    "net/http"
+    "os"
+    "os/signal"
+    "syscall"
+
+    "github.com/open-policy-agent/opa/rego"
+)
+
+type Decision struct {
+    Mode    string                 `json:"mode"`
+    Allow   bool                   `json:"allow"`
+    Redactions []map[string]any    `json:"redactions"`
+    StepUp  map[string]any         `json:"step_up"`
+    Reasons []string               `json:"reasons"`
+}
+
+type evalInput struct {
+    Mode     string                 `json:"mode"`
+    Action   string                 `json:"action"`
+    Auth     map[string]any         `json:"auth"`
+    Resource map[string]any         `json:"resource"`
+}
+
+type Engine struct {
+    modulePath string
+    prepared   *rego.PreparedEvalQuery
+}
+
+func NewEngine(modulePath string) (*Engine, error) {
+    e := &Engine{modulePath: modulePath}
+    if err := e.load(); err != nil { return nil, err }
+    return e, nil
+}
+
+func (e *Engine) load() error {
+    src, err := os.ReadFile(e.modulePath)
+    if err != nil { return err }
+    ctx := context.Background()
+    r := rego.New(
+        rego.Query("data.intelgraph.export.decision"),
+        rego.Module("export.rego", string(src)),
+    )
+    pq, err := r.PrepareForEval(ctx)
+    if err != nil { return err }
+    e.prepared = &pq
+    log.Printf("policy loaded: %s", e.modulePath)
+    return nil
+}
+
+func (e *Engine) Eval(ctx context.Context, in evalInput) (*Decision, error) {
+    if e.prepared == nil { if err := e.load(); err != nil { return nil, err } }
+    rs, err := e.prepared.Eval(ctx, rego.EvalInput(in))
+    if err != nil { return nil, err }
+    if len(rs) == 0 || len(rs[0].Expressions) == 0 { return nil, nil }
+    b, _ := json.Marshal(rs[0].Expressions[0].Value)
+    var dec Decision
+    if err := json.Unmarshal(b, &dec); err != nil { return nil, err }
+    return &dec, nil
+}
+
+func main() {
+    module := os.Getenv("EXPORT_POLICY")
+    if module == "" { module = "policies/export.rego" }
+    engine, err := NewEngine(module)
+    if err != nil { log.Fatalf("load policy: %v", err) }
+
+    mux := http.NewServeMux()
+
+    handler := func(mode string) http.HandlerFunc {
+        return func(w http.ResponseWriter, r *http.Request) {
+            var body evalInput
+            if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
+                http.Error(w, "bad json", http.StatusBadRequest); return
+            }
+            body.Mode = mode
+            if body.Action == "" { body.Action = "export" }
+            dec, err := engine.Eval(r.Context(), body)
+            if err != nil { http.Error(w, err.Error(), 500); return }
+            // Enforce on /export only
+            status := http.StatusOK
+            if mode == "enforce" && dec != nil && !dec.Allow {
+                status = http.StatusForbidden
+            }
+            w.Header().Set("content-type", "application/json")
+            w.WriteHeader(status)
+            json.NewEncoder(w).Encode(dec)
+        }
+    }
+
+    mux.HandleFunc("/export/simulate", handler("simulate"))
+    mux.HandleFunc("/export", handler("enforce"))
+    mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request){ w.WriteHeader(200); w.Write([]byte("ok")) })
+
+    srv := &http.Server{ Addr: ":8080", Handler: mux }
+
+    // Hot reload on SIGHUP
+    go func(){
+        c := make(chan os.Signal, 1)
+        signal.Notify(c, syscall.SIGHUP)
+        for range c { _ = engine.load() }
+    }()
+
+    log.Printf("export-gateway-go listening on %s", srv.Addr)
+    log.Fatal(srv.ListenAndServe())
+}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/export-gateway-go/main_test.go
+package main
+
+import (
+    "bytes"
+    "encoding/json"
+    "net/http"
+    "net/http/httptest"
+    "os"
+    "testing"
+)
+
+func TestSimulateAllowsWithoutStepUp(t *testing.T){
+    os.Setenv("EXPORT_POLICY", "../../policies/export.rego")
+    eng, err := NewEngine(os.Getenv("EXPORT_POLICY"))
+    if err != nil { t.Fatal(err) }
+    h := http.NewServeMux()
+    h.HandleFunc("/export/simulate", func(w http.ResponseWriter, r *http.Request){
+        var in evalInput
+        json.NewDecoder(r.Body).Decode(&in)
+        in.Mode = "simulate"
+        dec, err := eng.Eval(r.Context(), in)
+        if err != nil { t.Fatal(err) }
+        if dec == nil || !dec.Allow { t.Fatalf("expected allow in simulate, got %#v", dec) }
+    })
+    srv := httptest.NewServer(h); defer srv.Close()
+    payload := map[string]any{
+        "auth": map[string]any{"webauthn_verified": false},
+        "resource": map[string]any{"sensitivity":"Sensitive","fields":[]map[string]any{}},
+    }
+    b,_ := json.Marshal(payload)
+    resp, err := http.Post(srv.URL+"/export/simulate","application/json", bytes.NewReader(b))
+    if err != nil { t.Fatal(err) }
+    if resp.StatusCode != 200 { t.Fatalf("status=%d", resp.StatusCode) }
+}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/export-gateway-go/Dockerfile
+FROM golang:1.22-alpine AS build
+WORKDIR /src
+COPY go.mod ./
+RUN go mod download
+COPY . ./
+RUN CGO_ENABLED=0 go build -o /out/export-gateway-go ./
+
+FROM alpine:3.20
+WORKDIR /app
+COPY --from=build /out/export-gateway-go /usr/local/bin/export-gateway-go
+COPY ../../policies/export.rego /app/policies/export.rego
+ENV EXPORT_POLICY=/app/policies/export.rego
+EXPOSE 8080
+ENTRYPOINT ["/usr/local/bin/export-gateway-go"]
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/export-gateway-go/README.md
+# export-gateway-go
+
+Evaluates `policies/export.rego` in‑process and serves:
+
+- `POST /export/simulate` → returns decision (never blocks IO)
+- `POST /export` → enforces (403 when `allow=false`)
+
+## Run
+```bash
+go run .
+
+curl -sX POST localhost:8080/export/simulate \
+  -H 'content-type: application/json' \
+  -d '{"auth":{"webauthn_verified":false},"resource":{"sensitivity":"Restricted","fields":[]}}' | jq .
+```
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/export-gateway-go.yml
+name: Export Gateway (Go)
+on:
+  pull_request:
+    paths:
+      - 'services/export-gateway-go/**'
+      - 'policies/**'
+  push:
+    branches: [ main ]
+    paths:
+      - 'services/export-gateway-go/**'
+      - 'policies/**'
+jobs:
+  test:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-go@v5
+        with: { go-version: '1.22' }
+      - run: |
+          cd services/export-gateway-go
+          go test ./...
+
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 adjudication-run:
 	cd services/adjudication-queue && npm run migrate && npm run dev
+
+.PHONY: export-go-run
+export-go-run:
+	cd services/export-gateway-go && go run .
+
*** End Patch
```

---

## PR 7 — feat(service): **export‑gateway (Node/Express, shells to OPA CLI)**
**Branch:** `feat/service-export-gateway-node`

### What’s included
- Node/Express service with the same endpoints; invokes `opa eval` with stdin input.
- Multi‑stage Dockerfile that bundles the OPA binary.
- Basic smoke tests.

### Patch (unified diff)
```diff
*** Begin Patch
*** Add File: services/export-gateway-node/package.json
+{
+  "name": "export-gateway-node",
+  "version": "0.1.0",
+  "private": true,
+  "type": "module",
+  "scripts": {
+    "dev": "node src/server.js",
+    "test": "node --test"
+  },
+  "dependencies": {
+    "express": "^4.19.2"
+  }
+}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/export-gateway-node/src/server.js
+import express from 'express'
+import { spawn } from 'child_process'
+import path from 'path'
+import { fileURLToPath } from 'url'
+
+const __dirname = path.dirname(fileURLToPath(import.meta.url))
+const ROOT = path.resolve(__dirname, '../../..')
+const POLICY = process.env.EXPORT_POLICY || path.join(ROOT, 'policies', 'export.rego')
+const OPA = process.env.OPA_BIN || 'opa'
+
+const app = express()
+app.use(express.json())
+
+function evalPolicy(input){
+  return new Promise((resolve, reject) => {
+    const args = ['eval','--format=json','--data', POLICY,'data.intelgraph.export.decision','--stdin-input']
+    const p = spawn(OPA, args, { stdio: ['pipe','pipe','pipe'] })
+    let out = '', err = ''
+    p.stdout.on('data', d => out += d)
+    p.stderr.on('data', d => err += d)
+    p.on('close', code => {
+      if (code !== 0) return reject(new Error(err || `opa exit ${code}`))
+      try {
+        const j = JSON.parse(out)
+        const val = j.result?.[0]?.expressions?.[0]?.value
+        resolve(val)
+      } catch(e){ reject(e) }
+    })
+    p.stdin.end(JSON.stringify(input))
+  })
+}
+
+const handler = mode => async (req, res) => {
+  const input = { ...(req.body||{}), mode, action: 'export' }
+  try {
+    const dec = await evalPolicy(input)
+    const status = (mode === 'enforce' && dec && dec.allow === false) ? 403 : 200
+    res.status(status).json(dec)
+  } catch(e){ res.status(500).json({ error: e.message }) }
+}
+
+app.post('/export/simulate', handler('simulate'))
+app.post('/export', handler('enforce'))
+app.get('/healthz', (_req, res) => res.send('ok'))
+
+const port = process.env.PORT || 8081
+app.listen(port, () => console.log(`export-gateway-node on :${port}`))
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/export-gateway-node/Dockerfile
+# Stage 1: fetch OPA binary
+FROM openpolicyagent/opa:latest AS opa
+
+# Stage 2: Node app + OPA binary
+FROM node:20-alpine
+WORKDIR /app
+COPY package.json package-lock.json* ./
+RUN npm ci || npm i --production
+COPY src ./src
+COPY --from=opa /opa /usr/local/bin/opa
+COPY ../../policies/export.rego /app/policies/export.rego
+ENV EXPORT_POLICY=/app/policies/export.rego
+ENV OPA_BIN=/usr/local/bin/opa
+EXPOSE 8081
+CMD ["node","src/server.js"]
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/export-gateway-node/README.md
+# export-gateway-node
+
+Express service that shells to `opa eval`.
+
+```bash
+node src/server.js &
+curl -sX POST localhost:8081/export/simulate -H 'content-type: application/json' -d '{"auth":{"webauthn_verified":false},"resource":{"sensitivity":"Sensitive","fields":[]}}' | jq .
+```
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/export-gateway-node.yml
+name: Export Gateway (Node)
+on:
+  pull_request:
+    paths:
+      - 'services/export-gateway-node/**'
+      - 'policies/**'
+  push:
+    branches: [ main ]
+    paths:
+      - 'services/export-gateway-node/**'
+      - 'policies/**'
+jobs:
+  smoke:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-node@v4
+        with: { node-version: 20 }
+      - name: Install opa
+        run: |
+          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static
+          chmod +x opa && sudo mv opa /usr/local/bin/opa
+      - run: |
+          cd services/export-gateway-node
+          npm ci || npm i
+          node src/server.js &
+          sleep 1
+          curl -sX POST localhost:8081/export/simulate -H 'content-type: application/json' \
+            -d '{"auth":{"webauthn_verified":false},"resource":{"sensitivity":"Sensitive","fields":[]}}' | jq -e .mode >/dev/null
+
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 export-go-run:
 	cd services/export-gateway-go && go run .
+
+.PHONY: export-node-run
+export-node-run:
+	cd services/export-gateway-node && node src/server.js
+
*** End Patch
```

---

## Quick curl samples
```bash
# Simulate (always 200)
curl -sX POST localhost:8080/export/simulate -H 'content-type: application/json' \
  -d '{"auth":{"webauthn_verified":false},"resource":{"sensitivity":"Restricted","fields":[{"path":"email","tags":["pii:email"]}]}}' | jq .

# Enforce (403 when step-up missing)
curl -i -sX POST localhost:8080/export -H 'content-type: application/json' \
  -d '{"auth":{"webauthn_verified":false},"resource":{"sensitivity":"Restricted","fields":[]}}'
```

## Notes
- Both services read the repo’s `policies/export.rego`; keep policy as single source of truth.
- Go service is the recommended production path (no external OPA needed). Node is a simple parity demo.
- Hot‑reload: `kill -HUP <pid>` to reload policy file in Go service after edits.

