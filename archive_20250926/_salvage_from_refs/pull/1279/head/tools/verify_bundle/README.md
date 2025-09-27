# Verify Bundle CLI

Minimal verifier for export evidence bundles.

Usage:
```
python3 tools/verify_bundle/verify_bundle.py artifacts/evidence/20250101T000000Z
```

Exit codes:
- 0 = OK (all hashes match)
- 2 = Mismatch detected
- 3 = Error (usage/IO)

Notes:
- Pass the directory containing `evidence.json` (and `manifest.sha256`).
- If you have a `.tgz` or `.zip`, extract it first.

