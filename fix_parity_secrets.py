with open('.github/workflows/parity-check.yml') as f:
    content = f.read()

content = content.replace("${{ secrets.AWS_OIDC_ROLE_ARN != '' && matrix.cloud == 'aws' }}", "${{ env.AWS_ROLE_ARN != '' && matrix.cloud == 'aws' }}")
content = content.replace("${{ secrets.GCP_PROJECT_ID != '' && matrix.cloud == 'gcp' }}", "${{ env.GCP_PROJECT_ID != '' && matrix.cloud == 'gcp' }}")
content = content.replace("${{ secrets.AZURE_CLIENT_ID != '' && matrix.cloud == 'azure' }}", "${{ env.AZURE_CLIENT_ID != '' && matrix.cloud == 'azure' }}")
content = content.replace("${{ (matrix.cloud == 'aws' && secrets.AWS_OIDC_ROLE_ARN != '') || (matrix.cloud == 'gcp' && secrets.GCP_PROJECT_ID != '') || (matrix.cloud == 'azure' && secrets.AZURE_CLIENT_ID != '') }}", "${{ (matrix.cloud == 'aws' && env.AWS_ROLE_ARN != '') || (matrix.cloud == 'gcp' && env.GCP_PROJECT_ID != '') || (matrix.cloud == 'azure' && env.AZURE_CLIENT_ID != '') }}")

with open('.github/workflows/parity-check.yml', 'w') as f:
    f.write(content)
