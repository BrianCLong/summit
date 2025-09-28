# {{SERVICE_NAME}} Rollback Playbook

1. Identify the last known good GitHub release with passing cosign verification.
2. Download `dist/release.tar.gz`, `release.sig`, and `release.pem` artifacts.
3. Verify the signature locally:
   ```bash
   COSIGN_EXPERIMENTAL=1 cosign verify-blob \
     --certificate release.pem \
     --signature release.sig \
     dist/release.tar.gz
   ```
4. Re-deploy the verified artifact using the deployment automation (see `Makefile deploy`).
5. Post in `#incident-{{SERVICE_SLUG}}` with the result and attach logs under `.evidence/`.
