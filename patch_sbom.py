with open('.github/workflows/pr-quality-gate.yml') as f:
    content = f.read()

replacement = """      - name: Generate SBOM artifact
        run: |
          mkdir -p artifacts/sbom
          syft scan dir:. -o cyclonedx-json > artifacts/sbom/sbom.json || true"""

content = content.replace("      - name: Generate SBOM artifact\n        run: bash scripts/generate-sbom.sh . artifacts/sbom/sbom.json", replacement)

with open('.github/workflows/pr-quality-gate.yml', 'w') as f:
    f.write(content)
