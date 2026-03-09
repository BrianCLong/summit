# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Nov 3–Nov 14, 2025 (Sprint 3 of Q4 cadence)  
**Role:** Co‑CEO (Governance, Release Gate, Evidence, Policy)  
**Theme:** Standardize org‑wide “Golden Path” for disclosure‑first releases and prove it with a design‑partner‑ready portal.

---

## 1) Sprint Goal

“Make the hardened release path **org‑default** via reusable workflows and a policy registry, then **prove it end‑to‑end** with a design‑partner Disclosure Portal exposing evidence for the latest tag across repos.”

---

## 2) Objectives & Key Results (OKRs)

1. **Reusable workflow adoption ≥ 90%** of active repos.  
   _Measure:_ `uses: ./.github/workflows/org.release.hardened.yml` or `org/.github@main/.github/workflows/release.hardened.yml` referenced.
2. **Policy registry v1 live** with versioned OPA bundles + hashes.  
   _Measure:_ Disclosure Pack includes `policy_version` + `bundle_sha256`.
3. **Evidence surfacing** via **Disclosure Portal v1**.  
   _Measure:_ Portal shows latest release per repo with SBOM, provenance, attestation status, and Decision links.
4. **Mean PR cycle time ≤ 18h** on release PRs using Decision guard.  
   _Measure:_ Dashboard panel shows trailing 14‑day median.

---

## 3) Deliverables (Definition of Done)

- **Org reusable workflow**: `.github/workflows/org.release.hardened.yml` with params for language, build, and artifact globs.
- **Disclosure Pack Action**: composite action rendering `disclosure-pack.md` with vuln summary and policy versions.
- **Policy Registry**: `policy/registry.json` + `bundles/v1.*/*.rego` with published SHA256; test harness.
- **Cosign keyless by default** + verification gates pinned to registry identities.
- **Disclosure Portal v1** (static): reads GitHub Releases API + repo files; shows evidence; no PII.
- **Dashboards update**: add PR cycle time, reusable workflow adoption, and evidence completeness.

---

## 4) Work Plan & Owners

| Day    | Work Item                                      | Owner       | Exit Criteria                                                   |
| ------ | ---------------------------------------------- | ----------- | --------------------------------------------------------------- |
| Nov 3  | Create org reusable workflow skeleton + docs   | DevEx       | Reusable workflow in `.github` repo with inputs and examples    |
| Nov 4  | Composite action for Disclosure Pack render    | DevEx       | `uses: ./.github/actions/disclosure-pack@main` works in dry‑run |
| Nov 5  | Policy Registry v1 & OPA bundle hashes         | SecOps      | `registry.json` published; `opa test` green; hash recorded      |
| Nov 6  | Cosign keyless defaults + verify rules         | SecOps      | `cosign verify-attestation` constrained by OIDC issuer & SAN    |
| Nov 7  | Portal v1 scaffold + evidence adapters         | Co‑CEO + PM | Static site builds; reads releases, lists evidence; no secrets  |
| Nov 10 | Migrate 3 remaining repos to reusable workflow | DevEx       | 90% adoption threshold reached                                  |
| Nov 12 | Dashboards + PR cycle time + adoption          | DevEx       | Panels live with targets and alerts                             |
| Nov 14 | Demo: portal + tag cut across repos            | Co‑CEO      | Demo passes; Disclosure Packs render from composite action      |

---

## 5) Artifacts & Scaffolding

### 5.1 Reusable Hardened Release (Org‑wide)

**Path:** `.github/workflows/org.release.hardened.yml`

```yaml
name: org.release.hardened
on:
  workflow_call:
    inputs:
      language: { required: true, type: string, description: 'node|python|go' }
      build: { required: true, type: string, description: 'build command' }
      artifact_glob: { required: false, type: string, default: 'dist/**/*' }
    secrets:
      MAESTRO_TOKEN: { required: false }

permissions:
  contents: write
  id-token: write
  attestations: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup language
        if: ${{ inputs.language == 'node' }}
        uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - name: Install & build
        run: |
          if [ "${{ inputs.language }}" = node ]; then corepack enable && pnpm i --frozen-lockfile && ${{ inputs.build }}; fi
      - name: CycloneDX SBOM
        run: npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.json }

  provenance:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: slsa-framework/slsa-github-generator@v2.0.0
        id: slsa
      - run: echo "$SLSA_PROVENANCE" > provenance.intoto.jsonl
      - uses: actions/upload-artifact@v4
        with: { name: provenance, path: provenance.intoto.jsonl }

  verify:
    needs: [build, provenance]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: sbom, path: . }
      - uses: actions/download-artifact@v4
        with: { name: provenance, path: . }
      - name: OSV scan
        uses: google/osv-scanner-action@v1
        with: { sbom: sbom.json, output: osv.json }
      - name: Trivy SBOM
        uses: aquasecurity/trivy-action@0.22.0
        with:
          {
            scan-type: 'sbom',
            input: 'sbom.json',
            format: 'json',
            output: 'trivy.json',
          }
      - name: Cosign attest & verify (keyless)
        run: |
          cosign attest --predicate sbom.json --type cyclonedx $GITHUB_REF_NAME --yes
          cosign attest --predicate provenance.intoto.jsonl --type slsaprovenance $GITHUB_REF_NAME --yes
          cosign verify-attestation $GITHUB_REF_NAME --type cyclonedx --certificate-oidc-issuer https://token.actions.githubusercontent.com
          cosign verify-attestation $GITHUB_REF_NAME --type slsaprovenance --certificate-oidc-issuer https://token.actions.githubusercontent.com
      - name: Evidence completeness gate
        run: |
          test -s sbom.json && test -s provenance.intoto.jsonl

  disclosure:
    needs: verify
    uses: ./.github/workflows/_reusable.disclosure-pack.yml
    secrets: inherit

  release:
    needs: disclosure
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: disclosure, path: . }
      - uses: softprops/action-gh-release@v2
        with:
          name: ${{ github.ref_name }} (Hardened)
          body_path: disclosure-pack.md
          files: |
            sbom.json
            provenance.intoto.jsonl
            disclosure-pack.md
```

### 5.2 Composite Action — Disclosure Pack Renderer

**Path:** `.github/actions/disclosure-pack/action.yml`

```yaml
name: 'Disclosure Pack Renderer'
description: 'Render disclosure-pack.md from evidence + policy registry'
runs:
  using: 'composite'
  steps:
    - shell: bash
      run: |
        POLICY_JSON=.github/policy/registry.json
        POLICY_VERSION=$(jq -r '.current.version' $POLICY_JSON)
        POLICY_SHA=$(jq -r '.bundles[.current.version].sha256' $POLICY_JSON)
        CRIT=$(jq '[.vulnerabilities[]?|select(.severity=="CRITICAL")] | length' trivy.json 2>/dev/null || echo 0)
        cat <<'MD' > disclosure-pack.md
# Disclosure Pack — ${GITHUB_REF_NAME}
**Commit:** ${GITHUB_SHA}

## Evidence
- SBOM: `sbom.json`
- Provenance: `provenance.intoto.jsonl`
- Cosign: keyless (GitHub OIDC) — verified
- Policy: ${POLICY_VERSION} (${POLICY_SHA})

## Vulnerabilities
- Trivy criticals: ${CRIT}
- OSV: see `osv.json` (top advisories summarized in appendix)

## Risk & Rollback
- Canary budgets enforced via OPA `canary.rego`
- Auto‑rollback triggers: breach 2x window

## Decisions & Runs
- Maestro Run: (URL)
- IntelGraph Decision IDs: (IDs)
MD
        echo "Rendered disclosure-pack.md"
    - uses: actions/upload-artifact@v4
      with: { name: disclosure, path: disclosure-pack.md }
```

### 5.3 Reusable Disclosure Workflow (called from org.release.hardened)

**Path:** `.github/workflows/_reusable.disclosure-pack.yml`

```yaml
name: _reusable.disclosure-pack
on: { workflow_call: {} }
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: sbom, path: . }
      - uses: actions/download-artifact@v4
        with: { name: provenance, path: . }
      - uses: ./.github/actions/disclosure-pack
```

### 5.4 Policy Registry

**Path:** `.github/policy/registry.json`

```json
{
  "current": { "version": "v1.1" },
  "bundles": {
    "v1.0": { "sha256": "<hash>" },
    "v1.1": { "sha256": "<hash>" }
  }
}
```

### 5.5 Disclosure Portal v1 (static)

**Path:** `/tools/disclosure-portal/README.md`

```md
# Disclosure Portal v1

Static site that lists repos, latest tag, and attached evidence (SBOM, provenance, Disclosure Pack). Uses GitHub REST API (no secrets).

## Dev Quickstart

- `npm i && npm run dev`
- Configure `REPOS` in `repos.json`
```

**Minimal index.html (excerpt):**

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Disclosure Portal</title>
  </head>
  <body>
    <h1>Releases & Evidence</h1>
    <div id="app"></div>
    <script type="module">
      const repos = await (await fetch('repos.json')).json();
      const app = document.getElementById('app');
      for (const r of repos) {
        const rel = await fetch(
          `https://api.github.com/repos/${r}/releases/latest`,
        ).then((r) => r.json());
        const files =
          rel.assets?.map((a) => `<li>${a.name}</li>`).join('') || '';
        app.insertAdjacentHTML(
          'beforeend',
          `<section><h2>${r} — ${rel.tag_name || 'n/a'}</h2><ul>${files}</ul></section>`,
        );
      }
    </script>
  </body>
</html>
```

---

## 6) Dashboards & Alerts (adds)

- **Adoption:** % repos using reusable workflow (target ≥ 90%).
- **Evidence completeness:** tags with SBOM + provenance + Disclosure Pack (target 100%).
- **PR cycle time:** median (release‑labeled PRs) ≤ 18h; alert at 24h.
- **Attestation verify failures:** alert when >0 in last 24h.

---

## 7) Risks & Mitigations

| Risk                          | Likelihood | Impact | Mitigation                                                      |
| ----------------------------- | ---------: | -----: | --------------------------------------------------------------- |
| Repos with custom build steps |        Med |    Med | Reusable inputs + escape hatch to extend job                    |
| Portal rate‑limits            |        Low |    Low | Cache responses; static build step during CI                    |
| Policy version confusion      |        Low |    Med | Registry.json is single source of truth; pin in Disclosure Pack |

---

## 8) Alignment Notes

- Builds on Sprint 2’s hardened path & OPA v1.1.
- Preps for Sprint 4 (Nov 17–Dec 5): SOC2‑lite audit pack automation and design‑partner demos.

---

## 9) Exit Checklist

- Reusable workflow merged and referenced in repo CI.
- Composite action rendering packs in place.
- Policy registry committed; versions pinned.
- Portal v1 deployed as GitHub Pages (private if needed).
- Dashboards reflect adoption & cycle time with alerts.
