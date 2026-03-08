with open('.github/workflows/parity-check.yml') as f:
    content = f.read()

content = content.replace("jobs:", "env:\n  AWS_ROLE_ARN: ${{ secrets.AWS_OIDC_ROLE_ARN }}\n  GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}\n  AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}\n\njobs:")

with open('.github/workflows/parity-check.yml', 'w') as f:
    f.write(content)
