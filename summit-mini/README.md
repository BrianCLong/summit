# Summit Mini

A small, standalone “Summit Mini” that keeps the core differentiator (graph + provenance receipts + policy decision) with minimal deps: Node/TS + SQLite + a tiny React UI.

---

## What this “standalone version” includes

*   **Ingest**: paste text (or a “source” label) → stores a doc
*   **Graph build**: trivial entity extraction + co-occurrence edges
*   **Provenance**: emits & stores a **Receipt v0.1** per ingest
*   **Governance**: emits a **PolicyDecision v0.1** (simple built-in rules)
*   **UI**: ingest form + live nodes/edges + receipts

---

## Folder layout

```txt
summit-mini/
  README.md
  package.json
  pnpm-workspace.yaml
  schemas/
    Receipt.v0_1.schema.json
    PolicyDecision.v0_1.schema.json
  server/
    package.json
    tsconfig.json
    src/
      index.ts
      db.ts
      ingest.ts
      policy.ts
      types.ts
  web/
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/
      main.tsx
      App.tsx
      api.ts
      styles.css
```

---

## Run it

```bash
# from summit-mini/
pnpm install
pnpm dev
```

*   API: `http://localhost:4317/api/health`
*   UI: `http://localhost:5173`
