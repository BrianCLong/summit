# CDQD UI

A lightweight React dashboard for the Continuous Data Quality Detective service. The UI surfaces active anomalies, provides quick access to suppression windows, and exposes the service's deterministic replay for verifying alert reproducibility.

## Setup

```bash
cd ui/cdqd
pnpm install
pnpm run dev
```

By default the Vite dev server proxies API calls to `http://localhost:8080`. Override the backend location by setting `VITE_CDQD_API` when running `pnpm run dev` or `pnpm run build`.

## Scripts

- `pnpm run dev` – start the Vite development server.
- `pnpm run build` – type-check and produce a production bundle.
- `pnpm run preview` – preview the production build locally.

