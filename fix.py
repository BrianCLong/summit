import re

with open('.github/workflows/parity-check.yml') as f:
    content = f.read()

replacement = """      - name: Setup gcloud
        if: matrix.cloud == 'gcp'
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_POOL }}/${{ secrets.GCP_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      - name: Set up Cloud SDK
        if: matrix.cloud == 'gcp'
        uses: google-github-actions/setup-gcloud@v3
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}"""

old = """      - name: Setup gcloud
        if: matrix.cloud == 'gcp'
        uses: google-github-actions/setup-gcloud@v3
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}"""

content = content.replace(old, replacement)

with open('.github/workflows/parity-check.yml', 'w') as f:
    f.write(content)
