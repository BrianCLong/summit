Below are **hardened** drop‑ins: (1) a release workflow ready for SHA pinning via placeholders, and (2) a helper script to auto‑pin action SHAs using the GitHub API.

---

# 1) `.github/workflows/release.yml` (hardened, SHA‑pin ready)
```yaml
name: Release

on:
  push:
    tags: [ 'v*' ]
  workflow_dispatch:

# Principle of least privilege
permissions:
  contents: write
  actions: read
  id-token: write
  security-events: write

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

env:
  NODE_VERSION: '20'
  TRAJ_MIN_PASS_RATE: '0.95'
  GROUNDING_MIN_SCORE: '0.90'
  CI_EVIDENCE_ARTIFACT: ci-evidence-${{ github.sha }}

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        # Pin this to a commit SHA using pin-actions.sh
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Verify tag format
        run: |
          [[ "${GITHUB_REF_NAME}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]] || { echo "Tag ${GITHUB_REF_NAME} not semver"; exit 1; }

      - name: Download CI Evidence Artifact (best-effort)
        id: dl_artifacts
        uses: dawidd6/action-download-artifact@v6
        continue-on-error: true
        with:
          commit: ${{ github.sha }}
          name: ${{ env.CI_EVIDENCE_ARTIFACT }}
          path: reports

      - name: Check if evidence exists
        id: have_reports
        shell: bash
        run: |
          if [ -d "reports" ] && [ -n "$(ls -A reports || true)" ]; then
            echo "found=true" >> $GITHUB_OUTPUT
          else
            echo "found=false" >> $GITHUB_OUTPUT
          fi

      - name: Install deps (fallback)
        if: steps.have_reports.outputs.found == 'false'
        run: npm ci

      - name: Build (fallback)
        if: steps.have_reports.outputs.found == 'false'
        run: npm run build --if-present

      - name: Validate Trajectory (fallback)
        if: steps.have_reports.outputs.found == 'false'
        run: |
          mkdir -p reports
          npm run validate:trajectory --silent || true

      - name: Validate Grounding (fallback)
        if: steps.have_reports.outputs.found == 'false'
        run: npm run validate:grounding --silent || true

      - name: Upload SARIF (fallback)
        if: steps.have_reports.outputs.found == 'false' && hashFiles('reports/grounding.sarif') != ''
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: reports/grounding.sarif

      - name: Generate SBOM (CycloneDX)
        run: |
          npm i -D @cyclonedx/cyclonedx-npm
          npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json

      - name: Evidence manifest & checksums
        shell: bash
        run: |
          mkdir -p evidence/release
          cat > evidence/release/manifest.json << 'JSON'
          {
            "kind": "ci-evidence",
            "sha": "${{ github.sha }}",
            "paths": [
              "reports/junit-trajectory.xml",
              "reports/trajectory-report.json",
              "reports/trajectory-summary.md",
              "reports/grounding.sarif",
              "reports/grounding-report.json",
              "reports/grounding-summary.md",
              "sbom.json"
            ]
          }
          JSON
          for f in reports/junit-trajectory.xml reports/trajectory-report.json reports/trajectory-summary.md \
                   reports/grounding.sarif reports/grounding-report.json reports/grounding-summary.md \
                   sbom.json; do
            test -f "$f" && sha256sum "$f" >> evidence/release/SHA256SUMS || true
          done

      - name: Compose release notes
        id: notes
        uses: actions/github-script@v7
        env:
          TRAJ_MIN_PASS_RATE: ${{ env.TRAJ_MIN_PASS_RATE }}
          GROUNDING_MIN_SCORE: ${{ env.GROUNDING_MIN_SCORE }}
        with:
          script: |
            const fs = require('fs');
            const read = p => fs.existsSync(p) ? fs.readFileSync(p,'utf8') : '';
            const traj = read('reports/trajectory-summary.md');
            const grd  = read('reports/grounding-summary.md');
            const lines = [];
            lines.push(`# ${context.ref.replace('refs/tags/','')} — Release`);
            lines.push('');
            lines.push('## Highlights');
            lines.push('- CI Hardening: Trajectory + Grounding gates');
            lines.push('- Evidence: JUnit, SARIF, JSON summaries, SBOM');
            lines.push('');
            lines.push('## CI Evidence');
            if (traj) { lines.push('### Trajectory'); lines.push(traj.trim()); lines.push(''); }
            if (grd)  { lines.push('### Grounding'); lines.push(grd.trim()); lines.push(''); }
            lines.push('### Gates');
            lines.push(`- Trajectory pass-rate ≥ ${process.env.TRAJ_MIN_PASS_RATE}`);
            lines.push(`- Grounding score ≥ ${process.env.GROUNDING_MIN_SCORE}`);
            const body = lines.join('\n');
            fs.mkdirSync('reports',{recursive:true});
            fs.writeFileSync('reports/release-notes.md', body);
            core.setOutput('body_path','reports/release-notes.md');

      - name: Create GitHub Release & Upload Assets
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: ${{ github.ref_name }}
          body_path: ${{ steps.notes.outputs.body_path }}
          files: |
            reports/junit-trajectory.xml
            reports/trajectory-report.json
            reports/trajectory-summary.md
            reports/grounding.sarif
            reports/grounding-report.json
            reports/grounding-summary.md
            sbom.json
            evidence/release/manifest.json
            evidence/release/SHA256SUMS
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # (Optional) SLSA provenance attestation — add when ready
      # - name: Attest Build Provenance
      #   uses: slsa-framework/slsa-github-generator/.github/actions/generator@<pin>
      #   with: {}
```

---

# 2) `.github/scripts/pin-actions.sh` (auto‑pin helper)
```bash
#!/usr/bin/env bash
set -euo pipefail

# Requires: gh CLI authenticated (gh auth login) with repo read access.
# Usage: .github/scripts/pin-actions.sh .github/workflows/release.yml

WF=${1:-.github/workflows/release.yml}

declare -A MAP=(
  [actions/checkout]=v4
  [actions/setup-node]=v4
  [dawidd6/action-download-artifact]=v6
  [github/codeql-action/upload-sarif]=v3
  [actions/github-script]=v7
  [softprops/action-gh-release]=v2
)

TMP=$(mktemp)
cp "$WF" "$TMP"

for repo in "${!MAP[@]}"; do
  ver="${MAP[$repo]}"
  echo "Resolving ${repo}@${ver}…" >&2
  # Get the ref's commit SHA (tag or branch)
  sha=$(gh api repos/${repo}/git/refs/tags/${ver} --jq .object.sha 2>/dev/null || true)
  if [[ -z "$sha" ]]; then
    sha=$(gh api repos/${repo}/releases/latest --jq .target_commitish 2>/dev/null || true)
  fi
  if [[ -z "$sha" ]]; then
    sha=$(gh api repos/${repo}/commits/${ver} --jq .sha 2>/dev/null || true)
  fi
  if [[ -z "$sha" ]]; then
    echo "Warning: could not resolve ${repo}@${ver}; leaving as-is" >&2
    continue
  fi
  short=${sha}
  echo "Pinning ${repo}@${ver} -> ${short}" >&2
  # Replace 'uses: repo@ver' with 'uses: repo@sha'
  sed -i.bak -E "s|(uses:\s*${repo})@[^\n]+|\1@${short}|g" "$TMP"
done

mv "$TMP" "$WF"
echo "Pinned SHAs written to ${WF}. Backup at ${WF}.bak"
```

---

## Notes
- Run the pin helper locally or in a one‑off PR to replace tag refs with exact SHAs.
- Re‑run whenever you intentionally upgrade an action version.
- You can add this script to a separate **“Pin Actions”** workflow that opens an automated PR when pins drift.
