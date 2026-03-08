# Security Package: SpiderFoot Parity & Proof Moat

## 1. Threat Model (STRIDE)

*   **Spoofing:** A malicious module mimics a legitimate collector.
    *   *Mitigation:* Modules are cryptographically signed. The runner verifies signatures before execution.
*   **Tampering:** Evidence bundles are modified after generation to alter findings.
    *   *Mitigation:* Content-addressed storage (BLAKE3 hashing of canonicalized JSON). Any tampering invalidates the `stamp.json` signature and the `EVIDENCE_ID`.
*   **Repudiation:** A tenant denies generating a specific report or taking an action.
    *   *Mitigation:* Immutable, append-only audit logs. The Provenance Graph tracks every transformation.
*   **Information Disclosure:** A module leaks API keys or tenant PII to an external server.
    *   *Mitigation:* Strict Network Egress Policies (`sdk/module/netpolicy.ts`) enforced at the sandbox level. Secrets are injected at runtime via Vault, never logged, and redacted from evidence artifacts.
*   **Denial of Service:** A module enters an infinite loop or consumes excessive memory, crashing the runtime.
    *   *Mitigation:* Sandboxed execution (`runtime/runner/sandbox.ts`) with hard CPU, memory, and timeout limits.
*   **Elevation of Privilege:** A vulnerability in SpiderFoot allows arbitrary code execution on the host.
    *   *Mitigation:* The SpiderFoot adapter runs the external tool in an isolated, unprivileged Docker container with no access to the Summit Control Plane or Graph Store.

## 2. Security Requirements & Controls

*   **Integrity Gate:** `core/evidence/bundle.ts` MUST reject any finding that does not possess a valid array of `evidence_ids`.
*   **Verification:** The `summit verify <bundle>` CLI command MUST validate the pipeline digest, code digest, and artifact hashes against the provided signatures.
*   **Data Classification:** Evidence artifacts containing credentials or PII MUST be tagged and subjected to tenant-specific retention and redaction policies before export.

## 3. Implementation Guidance

*   **Secret Management:** Modules request secrets via `sdk/module/secrets.ts`. The runner fetches these from HashiCorp Vault just-in-time.
*   **Sandboxing:** Utilize gVisor or strict Docker seccomp profiles for the `runtime/runner/sandbox.ts`.
*   **Audit Logging:** All control plane actions (starting runs, modifying policies, approving exports) are written to a structured, queryable Postgres table.

## 4. CI/CD Hardening

*   **SBOM:** Generate CycloneDX/SPDX SBOMs during the build phase.
*   **SLSA:** Generate SLSA Level 3 provenance attestations for all release artifacts (Docker images, CLI binaries).
*   **Dependency Pinning:** All third-party GitHub Actions and npm packages must be pinned to specific SHAs/versions.

## 5. Security Regression Tests

*   `tests/security/tamper.test.ts`: Modifies a byte in an evidence blob and asserts that verification fails.
*   `tests/security/secret_leak.test.ts`: Injects a mock API key, simulates a module dumping it to output, and asserts the redaction pipeline successfully masks it.

## 6. Required CI Action Snippets

The following snippet enforces the Integrity Gate in the CI pipeline:

```yaml
jobs:
  verify-evidence-integrity:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'

      - name: Install dependencies
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate
          pnpm install --frozen-lockfile

      - name: Generate Fixture Bundle
        run: pnpm dlx tsx cli/commands/run.ts --fixture evals/fixtures/osint_entities.json

      - name: Assert Chain of Custody (Integrity Gate)
        run: pnpm dlx tsx cli/commands/verify.ts artifacts/latest/report.json

      - name: Archive Artifacts on Failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: integrity-failure-logs-${{ github.run_id }}
          path: artifacts/
```
