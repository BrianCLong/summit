# {{SERVICE_NAME}} Rollback Plan

1. Verify last release assets and provenance signature.
2. Redeploy prior artifact via infrastructure pipeline referencing cosign signature.
3. Run synthetic `synthetics/ui_availability.json` to confirm success.
