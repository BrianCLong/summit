
# Runbook: Maestro Spec Generation

This runbook covers the operation and troubleshooting of the Maestro Spec Interview Engine.

## Operational Flow

1. **Initiation**: Run the interview engine with `python3 agents/maestro/interview_engine.py <output_path>`.
2. **Review**: Review the generated `spec_bundle.json`.
3. **Validation**: Run the GA gate locally: `node scripts/ga/verify-maestro-spec.mjs <bundle_path>`.

## Troubleshooting

### Failure: Score below 20

- **Cause**: Missing sections or open questions.
- **Fix**: Resolve all open questions and ensure scope is defined.

### Failure: Missing IDs

- **Cause**: Requirement added without ID generator.
- **Fix**: Re-run the engine to ensure ID assignment logic is applied.

## Escalation

Contact the Engineering Team for any persistent failures in the interview engine.
