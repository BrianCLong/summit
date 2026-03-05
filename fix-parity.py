with open('.github/workflows/parity-check.yml') as f:
    content = f.read()

content = content.replace("run: bash scripts/ci/parity_check.sh", "if: ${{ (matrix.cloud == 'aws' && secrets.AWS_OIDC_ROLE_ARN != '') || (matrix.cloud == 'gcp' && secrets.GCP_PROJECT_ID != '') || (matrix.cloud == 'azure' && secrets.AZURE_CLIENT_ID != '') }}\n        run: bash scripts/ci/parity_check.sh")

with open('.github/workflows/parity-check.yml', 'w') as f:
    f.write(content)
