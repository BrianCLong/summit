# Data Classification Policy

All artifacts in this repository must be classified. The default and ONLY allowed classification for general repository content is **PUBLIC**.

## Classification Levels

1.  **PUBLIC**: Available for open publication. No restricted information.
2.  **CUI** (Controlled Unclassified Information): **FORBIDDEN** in this repo.
3.  **EXPORT_CONTROLLED** (ITAR/EAR): **FORBIDDEN** in this repo.
4.  **CLASSIFIED**: **FORBIDDEN** in this repo.

## Marking Requirements

All concept notes and major documents must start with a classification header:
`DATA_CLASSIFICATION: PUBLIC`

## Enforcement

CI gates will block any commit containing markers for CUI, EXPORT_CONTROLLED, or CLASSIFIED levels outside of approved policy definition files.
