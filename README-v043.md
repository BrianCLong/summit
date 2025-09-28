# v0.4.3 QECN — Snap‑in Steps
1) Merge; resolve persisted IDs for new ops in CI.
2) Mount `v043Resolvers` in your server alongside v0.4.x.
3) Apply Helm overlay `values-v043-qecn.yaml` and import dashboard JSON.
4) Enable `v043-qecn-verify` workflow; make required on `main`.
5) Add `QecnPanel` to the Sovereign Console; wire client calls.