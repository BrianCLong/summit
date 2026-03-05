import re

with open('.github/workflows/parity-check.yml') as f:
    content = f.read()

# AWS
content = re.sub(
    r'(\s*-\s*name:\s*Configure AWS Credentials\n\s*if:\s*)matrix\.cloud == \'aws\'',
    r'\g<1>${{ secrets.AWS_OIDC_ROLE_ARN != \'\' && matrix.cloud == \'aws\' }}',
    content
)

# GCP
content = re.sub(
    r'(\s*-\s*name:\s*Setup gcloud\n\s*if:\s*)matrix\.cloud == \'gcp\'',
    r'\g<1>${{ secrets.GCP_PROJECT_ID != \'\' && matrix.cloud == \'gcp\' }}',
    content
)

# Azure
content = re.sub(
    r'(\s*-\s*name:\s*Setup Azure CLI\n\s*if:\s*)matrix\.cloud == \'azure\'',
    r'\g<1>${{ secrets.AZURE_CLIENT_ID != \'\' && matrix.cloud == \'azure\' }}',
    content
)

with open('.github/workflows/parity-check.yml', 'w') as f:
    f.write(content)
