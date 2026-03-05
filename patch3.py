import re

with open('.github/workflows/parity-check.yml') as f:
    content = f.read()

# Let's see if we can check for the presence of the secrets.
# E.g. add `if: ${{ env.HAS_SECRETS == 'true' }}` to the credentials steps and the run parity check step.

new_content = re.sub(
    r"      - name: Configure AWS Credentials",
    r"      - name: Check Secrets\n        id: secrets\n        env:\n          AWS_ROLE_ARN: ${{ secrets.AWS_OIDC_ROLE_ARN }}\n        run: |\n          if [ -n \"$AWS_ROLE_ARN\" ]; then\n            echo \"has_secrets=true\" >> $GITHUB_ENV\n          else\n            echo \"has_secrets=false\" >> $GITHUB_ENV\n          fi\n\n      - name: Configure AWS Credentials",
    content
)

# Replace `if: matrix.cloud == 'aws'` with `if: matrix.cloud == 'aws' && env.has_secrets == 'true'`
new_content = new_content.replace(
    "if: matrix.cloud == 'aws'",
    "if: matrix.cloud == 'aws' && env.has_secrets == 'true'"
)
new_content = new_content.replace(
    "if: matrix.cloud == 'gcp'",
    "if: matrix.cloud == 'gcp' && env.has_secrets == 'true'"
)
new_content = new_content.replace(
    "if: matrix.cloud == 'azure'",
    "if: matrix.cloud == 'azure' && env.has_secrets == 'true'"
)

# And for the parity check script
new_content = new_content.replace(
    "      - name: Run parity check",
    "      - name: Run parity check\n        if: env.has_secrets == 'true'"
)

# Also for the upload artifact step
new_content = new_content.replace(
    "      - name: Upload parity artifact",
    "      - name: Upload parity artifact\n        if: env.has_secrets == 'true'"
)

with open('.github/workflows/parity-check.yml', 'w') as f:
    f.write(new_content)
