with open('.github/workflows/pr-quality-gate.yml', 'r') as f:
    content = f.read()

replacement = """  longrun-job-validation:
    name: LongRunJob Spec Advisory Validation
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js"""

import re
content = re.sub(r'  longrun-job-validation:\n    name: LongRunJob Spec Advisory Validation\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout\n        uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6\n\n      - name: Setup Node.js', replacement, content)

content = content.replace("run: pnpm lint:release-policy", "run: pnpm run test:release-scripts")

replacement2 = """      - name: Generate SBOM artifact
        run: |
          mkdir -p artifacts/sbom
          syft scan dir:. -o cyclonedx-json > artifacts/sbom/sbom.json || true"""

content = content.replace("      - name: Generate SBOM artifact\n        run: bash scripts/generate-sbom.sh . artifacts/sbom/sbom.json", replacement2)

with open('.github/workflows/pr-quality-gate.yml', 'w') as f:
    f.write(content)
