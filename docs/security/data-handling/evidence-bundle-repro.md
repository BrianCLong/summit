# Data Handling: Evidence Bundles

## Classification
* **Public**: `evidence_index.json`, Public Keys (`.ci/keys/minisign.pub`), `.sig` files.
* **Internal**: Build artifacts (`build.tgz`), Evidence JSONs (unless sanitized).
* **Confidential**: Private Signing Keys (`MINISIGN_SECRET_KEY`).

## Never Log
* `MINISIGN_SECRET_KEY`
* `MINISIGN_PASSWORD`
* API Tokens inside evidence files (evidence generators must redact secrets).

## Retention
* Release artifacts are retained indefinitely (or per policy) in GitHub Releases.
* CI artifacts are retained for 90 days.
