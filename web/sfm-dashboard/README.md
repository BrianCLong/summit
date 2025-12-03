# SFM Dashboard

TypeScript/Vite dashboard for the Streaming Fairness Monitor. It surfaces live metrics,
alerts, signed snapshot creation, and deterministic replays provided by the SFM Go
service.

## Getting started

```bash
cd web/sfm-dashboard
npm install
npm run dev
```

The Vite dev server proxies API requests to `http://localhost:8085` (the default SFM
service address). Adjust the proxy in `vite.config.ts` if you run the service elsewhere.

## Build

```bash
npm run build
```

This produces a static bundle in `dist/` suitable for serving from any CDN or embedding in
the broader Summit UI stack.
