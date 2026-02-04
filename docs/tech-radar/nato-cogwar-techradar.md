# NATO Cognitive Warfare Tech Radar (Defensive-Only)

**ITEM slug:** `nato-cogwar-techfamilies`

## Purpose

This radar frames defensive technology families aligned to NATO public S&T activity lines, with
explicitly defensive-only build vs plug decisions.

## Tech Families

| NATO-framed capability family | Defensive tech stack | Summit build vs plug-in | Evidence hook |
| --- | --- | --- | --- |
| AI/data/social tooling (profiling + detection) | Entity resolution, graph ML, CIB detection, SOCMINT labeling | **Build**: graph features + anomaly models; **Plug**: external SOCMINT feeds | EVD-nato-cogwar-techfamilies-ai-001 |
| Platforms/XR/immersive environments | Telemetry schemas, identity graphs, avatar/handle linking | **Build**: schema + adapter interface; **Plug**: platform collectors (OFF by default) | EVD-nato-cogwar-techfamilies-xr-001 |
| Synthetic media + “synthetic credibility” | Provenance (C2PA-like), perceptual hashing, forensic scoring | **Build**: provenance ledger + plugin API; **Plug**: vendor forensics | EVD-nato-cogwar-techfamilies-synth-001 |
| Indicators & Warnings | Time-series features, narrative shift models, alerting | **Build**: I&W pipeline + alert schema + dashboards | EVD-nato-cogwar-techfamilies-iw-001 |
| NeuroS/T convergence (metadata-only) | Ethics gating, metadata-only placeholders | **Build**: schema placeholder + strict policy gate; no data ingestion | EVD-nato-cogwar-techfamilies-neuro-001 |

## STO Activity Alignment

NATO STO public activities emphasize technology enablers for AI-based assistance/automation and
indicators & warnings in cyberspace; this radar maps those lines to defensible, auditable modules
while preserving meaningful human control.
