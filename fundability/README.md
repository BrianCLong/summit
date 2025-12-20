# Fundability Pack Artifacts (Sprint 6)

This folder houses the Sprint 6 investor/demo collateral referenced in the Fundability Pack and GA pricing brief. Use this structure to keep the customer-ready files and their editable sources discoverable.

## Artifact map

- `fundability/deck_v1/` — Investor/Fundability deck source and exports (e.g., `.pptx` and `deck_v1.pdf`).
- `fundability/security_posture_v1.md` and `fundability/security_posture_v1.pdf` — Security posture brief covering zero trust, OPA/ABAC, SBOM/SLSA, DR posture, retention/purge manifests, and incident handling.
- `fundability/compliance_roadmap_v1.md` and `fundability/compliance_roadmap_v1.pdf` — Compliance roadmap with SOC2/ISO milestones, automation coverage, and evidence mapping.
- `fundability/demo_script_v1.md` — Sales demo script aligned to the demo tenant bundle.
- `demo/seed_bundle_v1/` — One-click demo tenant assets (seeds, configs, receipts/evidence bundles, exportable reports).
- `fundability/reference_architecture_v1/` — Reference architecture pack (internal, white-label, hosted SaaS) diagrams and explainers, including trust boundaries, data flows, threat assumptions, and Day-2 ops notes.
- `fundability/unit_econ_model_v1.xlsx` plus `fundability/unit_econ_model_v1/README.md` — TCO/unit economics model pulling metering and infra costs; include sensitivity toggles and margin outputs.
- `fundability/ga_pricing_v1.md` — GA pricing proposal mapping SKUs to meters/quotas and invoice line items; include sample export path `reports/invoicing/sample_invoice_v1.csv`.

## Conventions

- Keep evidence references close to each artifact (e.g., link to receipts, dashboards, or audit exports).
- Use versioned subfolders (`*_v1`, `*_v2`, …) to avoid overwriting released collateral.
- Prefer source formats that remain editable (`.pptx`, `.drawio`, `.excalidraw`, `.xlsx`, or Markdown) alongside exported PDFs for distribution.
