# Team prompts clarifications (IntelGraph GA)

This note captures answers to the optional tuning questions so each team can unblock implementation without altering their independent scopes or feature-flag boundaries.

## Optional tuning answers

1. **Connectors for Pack A (Ingest Wizard)**: Proceed with the proposed five — STIX/TAXII, MISP, OFAC/EU sanctions, RSS news, and S3 bulk CSV.
2. **ZK/Wallet demo target**: Prioritize a court partner environment, with a liaison-ready preset as the secondary audience.
3. **Tri-pane COA overlays**: Ship the tri-pane UI without COA comparison overlays in this sprint; schedule COA overlays as a follow-up behind a dedicated flag.

## Notes for coordination

- Keep all new functionality behind the existing feature flags noted in the team briefs (e.g., `COPILOT_NLQ`, `ER_PROBABILISTIC`, `ZK_TX`, `PROV_WALLETS`, `UI_TRIPANE`).
- Maintain zero breaking changes to shared gateways and GraphQL schemas; additive patterns only.
- Continue to align docs, demos, and runbooks with the GA acceptance artifacts for each slice.
