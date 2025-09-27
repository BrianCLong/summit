# CAFF Next.js Demo

This Next.js app visualizes the Consent-Aware Feature Flags workflow. It imports the TypeScript SDK directly to:

- Build subject contexts (jurisdiction, audiences, consent map)
- Run deterministic evaluations with explain paths
- Call the Go evaluation service (when running locally)
- Preview dry-run policy diffs highlighting impacted flags

## Getting Started

```bash
cd demos/caff-demo
npm install
npm run dev
```

By default the page points to `http://localhost:8080` for service-backed evaluations. Start the Go service (`go run services/caff`) or update the base URL inside `app/page.tsx`.
