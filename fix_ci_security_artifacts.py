import os

def fix_ci_security_yml():
    filepath = ".github/workflows/ci-security.yml"
    if not os.path.exists(filepath): return

    with open(filepath, "r") as f:
        content = f.read()

    # 1. Fix Gitleaks license issue by using a free alternative or removing the license check expectation if possible.
    # Actually, Gitleaks action v2 might be old. v8.18+ requires license for some features?
    # The error message says "missing gitleaks license".
    # We can try using the binary directly or a different action configuration.
    # For now, let's try to update the action or config to not error out if possible,
    # or just accept it's broken and try to disable it temporarily if it blocks?
    # No, it's a blocking gate.
    # Let's verify what version is being used. Log says gitleaks version: 8.24.3 via action v2.
    # Gitleaks is free for open source. Is this repo private? "BrianCLong/summit" seems public?
    # If private/org, it might need license.
    # START-UP FIX: ensure we are fetching history 0 (already done).

    # 2. Fix Trivy artifact name conflict
    # The job `filesystem-scan` uploads `security-reports` with `trivy-fs.sarif`.
    # The job `container-scan` uploads `security-reports` with `trivy-server.sarif`.
    # `actions/upload-artifact` v4 DOES NOT merge by default with same name unless `merge-multiple: true` is set on download side or distinct names are used.
    # But wait, the error is `Conflict: an artifact with this name already exists`.
    # In v4, you cannot upload to the same artifact name multiple times in the same run unless you delete it first?
    # Actually v4 allows overwriting if configured, but better to use unique names per job and merge later.
    # The `security-summary` job tries to download them all.
    # Let's rename artifacts in upload steps: `security-reports-fs`, `security-reports-container`, etc.

    # 3. Fix DAST docker-compose
    # Error: "no such service: client".
    # Need to check docker-compose.yml content.

    lines = content.splitlines()
    new_lines = []

    for line in lines:
        # Rename artifacts to avoid conflict
        if "name: security-reports" in line:
            # We need context to know WHICH job we are in.
            # This is hard with simple line iteration.
            pass

    # Regex replacement might be safer for artifact names.
    import re

    # 1. Unique artifact names
    content = re.sub(r'name: security-reports\s+path: results.sarif', 'name: security-reports-secret\n          path: results.sarif', content)
    content = re.sub(r'name: security-reports\s+path: \$\{\{ env.REPORT_DIR \}\}/semgrep.sarif', 'name: security-reports-semgrep\n          path: ${{ env.REPORT_DIR }}/semgrep.sarif', content)
    content = re.sub(r'name: security-reports\s+path: \$\{\{ env.REPORT_DIR \}\}/snyk.sarif', 'name: security-reports-snyk\n          path: ${{ env.REPORT_DIR }}/snyk.sarif', content)
    content = re.sub(r'name: security-reports\s+path: \$\{\{ env.REPORT_DIR \}\}/trivy-fs.sarif', 'name: security-reports-fs\n          path: ${{ env.REPORT_DIR }}/trivy-fs.sarif', content)

    # Container scan uploads multiple files, maybe keep one artifact or split?
    # It uploads server and client sarif.
    content = re.sub(r'name: security-reports\s+path: \|\s+\$\{\{ env.REPORT_DIR \}\}/trivy-server.sarif', 'name: security-reports-container\n          path: |\n            ${{ env.REPORT_DIR }}/trivy-server.sarif', content)

    content = re.sub(r'name: security-reports\s+path: \$\{\{ env.REPORT_DIR \}\}/trivy-license.json', 'name: security-reports-license\n          path: ${{ env.REPORT_DIR }}/trivy-license.json', content)
    content = re.sub(r'name: security-reports\s+path: \$\{\{ env.REPORT_DIR \}\}/results.sarif', 'name: security-reports-iac\n          path: ${{ env.REPORT_DIR }}/results.sarif', content)
    content = re.sub(r'name: security-reports\s+path: rendered', 'name: security-reports-opa\n          path: rendered', content)
    content = re.sub(r'name: security-reports\s+path: \$\{\{ env.REPORT_DIR \}\}/trivy-cis.json', 'name: security-reports-cis\n          path: ${{ env.REPORT_DIR }}/trivy-cis.json', content)
    content = re.sub(r'name: security-reports\s+path: \$\{\{ env.REPORT_DIR \}\}/baseline-report.json', 'name: security-reports-baseline\n          path: ${{ env.REPORT_DIR }}/baseline-report.json', content)

    # DAST artifact
    content = re.sub(r'name: security-reports\s+path: \|\s+\$\{\{ env.REPORT_DIR \}\}/zap-report.html', 'name: security-reports-dast\n          path: |\n            ${{ env.REPORT_DIR }}/zap-report.html', content)

    # 4. Update download-artifact in summary job to pattern match
    # pattern: security-reports-*
    # merge-multiple: true
    content = content.replace("name: security-reports\n          path: aggregated-security", "pattern: security-reports-*\n          path: aggregated-security")

    with open(filepath, "w") as f:
        f.write(content)

fix_ci_security_yml()
