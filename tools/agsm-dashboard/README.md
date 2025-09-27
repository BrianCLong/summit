# AGSM Dashboard

A lightweight TypeScript CLI that renders the metrics produced by the AGSM Go runner.

## Usage

```bash
cd tools/agsm-dashboard
pnpm install
pnpm start -- --state ../../services/agsm/state/metrics.json --once
```

Add `--watch` to leave the dashboard open and automatically refresh as new probe iterations are written to disk.
