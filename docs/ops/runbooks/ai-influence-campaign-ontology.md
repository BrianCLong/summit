# Runbook: AI Influence Campaign Ontology

This runbook outlines standard operating procedures for the AI Influence Campaign schema and associated deterministic artifacts within Summit.

## Adding a New Tactic
1. Edit `config/ontology/ai-influence-campaign/tactics.catalog.json`.
2. Provide a unique string ID and a human-readable name.
3. Validate schema determinism.

## Adding a New Fixture
1. Navigate to `config/ontology/ai-influence-campaign/fixtures/`.
2. Create a new `.json` file containing the campaign payload following the `summit.ai-influence-campaign.ontology.v0` schema format.
3. Run the artifact emission script `npm run generate-ontology-artifacts` (or directly via `ts-node analysis/ontology/emit-artifacts.ts`).

## Troubleshooting Determinism Failures
- Run `npm run test:ontology`.
- Examine the diff produced by consecutive runs of the artifact emitter.
- Arrays MUST be deterministically sorted via `AiInfluenceCampaignEnricher`.

## Reviewing Drift Alerts
- If `scripts/monitoring/ai-influence-campaign-drift.ts` alerts, it means a fixture uses an unregistered tactic or technique. Review and formally register them in the corresponding catalog JSON files.
