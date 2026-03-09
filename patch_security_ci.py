with open(".github/workflows/ci-security.yml", "r") as f:
    content = f.read()

# Fix artifact name conflicts by appending a unique string or using different names.
content = content.replace("name: security-reports\n        path: security-reports/trivy-fs.sarif", "name: security-reports-trivy-fs\n        path: security-reports/trivy-fs.sarif")
content = content.replace("name: security-reports\n        path: results.sarif", "name: security-reports-gitleaks\n        path: results.sarif")
content = content.replace("name: security-reports\n        path: |\n          security-reports/trivy-server.sarif\n          security-reports/trivy-client.sarif", "name: security-reports-trivy-container\n        path: |\n          security-reports/trivy-server.sarif\n          security-reports/trivy-client.sarif")
content = content.replace("name: security-reports\n        path: security-reports/trivy-license.json", "name: security-reports-trivy-license\n        path: security-reports/trivy-license.json")
content = content.replace("name: security-reports\n        path: security-reports/semgrep.sarif", "name: security-reports-semgrep\n        path: security-reports/semgrep.sarif")
content = content.replace("name: security-reports\n        path: rendered", "name: security-reports-opa-rendered\n        path: rendered")
content = content.replace("name: security-reports\n        path: security-reports/results.sarif", "name: security-reports-checkov\n        path: security-reports/results.sarif")
content = content.replace("name: security-reports\n        path: security-reports/baseline-report.json", "name: security-reports-baseline\n        path: security-reports/baseline-report.json")
content = content.replace("name: security-reports\n        path: |\n          security-reports/zap-report.html\n          security-reports/zap-report.md\n          security-reports/zap-report.json", "name: security-reports-zap\n        path: |\n          security-reports/zap-report.html\n          security-reports/zap-report.md\n          security-reports/zap-report.json")
content = content.replace("name: security-reports\n        path: aggregated-security/security-summary.json", "name: security-summary-report\n        path: aggregated-security/security-summary.json")

# Fix python indentation error
content = content.replace("""        run: |
          python - <<'PY'
            import json
            import os""", """        run: |
          python - <<'PY'
          import json
          import os""")
content = content.replace("""            from pathlib import Path

            report_root = Path('aggregated-security')""", """          from pathlib import Path

          report_root = Path('aggregated-security')""")
content = content.replace("""            files = sorted(str(p.relative_to(report_root)) for p in report_root.rglob('*') if p.is_file())
            status = {""", """          files = sorted(str(p.relative_to(report_root)) for p in report_root.rglob('*') if p.is_file())
          status = {""")
content = content.replace("""                "Secret scanning": os.environ.get('SECRET_STATUS', 'unknown'),
                "SAST": os.environ.get('SAST_STATUS', 'unknown'),
                "Semgrep": os.environ.get('SEMGREP_STATUS', 'unknown'),
                "Dependencies": os.environ.get('DEP_STATUS', 'unknown'),
                "Filesystem": os.environ.get('FS_STATUS', 'unknown'),
                "Container": os.environ.get('IMG_STATUS', 'unknown'),
                "Licenses": os.environ.get('LIC_STATUS', 'unknown'),
                "IaC": os.environ.get('IAC_STATUS', 'unknown'),
                "OPA policies": os.environ.get('OPA_STATUS', 'unknown'),
                "CIS benchmark": os.environ.get('CIS_STATUS', 'unknown'),
                "Baseline": os.environ.get('BASELINE_STATUS', 'unknown'),
                "DAST": os.environ.get('DAST_STATUS', 'skipped'),
            }
            summary = {
                "reportCount": len(files),
                "reports": files,
                "statuses": status,
            }
            report_root.mkdir(parents=True, exist_ok=True)
            with (report_root / 'security-summary.json').open('w', encoding='utf-8') as fh:
                json.dump(summary, fh, indent=2)
          PY""", """              "Secret scanning": os.environ.get('SECRET_STATUS', 'unknown'),
              "SAST": os.environ.get('SAST_STATUS', 'unknown'),
              "Semgrep": os.environ.get('SEMGREP_STATUS', 'unknown'),
              "Dependencies": os.environ.get('DEP_STATUS', 'unknown'),
              "Filesystem": os.environ.get('FS_STATUS', 'unknown'),
              "Container": os.environ.get('IMG_STATUS', 'unknown'),
              "Licenses": os.environ.get('LIC_STATUS', 'unknown'),
              "IaC": os.environ.get('IAC_STATUS', 'unknown'),
              "OPA policies": os.environ.get('OPA_STATUS', 'unknown'),
              "CIS benchmark": os.environ.get('CIS_STATUS', 'unknown'),
              "Baseline": os.environ.get('BASELINE_STATUS', 'unknown'),
              "DAST": os.environ.get('DAST_STATUS', 'skipped'),
          }
          summary = {
              "reportCount": len(files),
              "reports": files,
              "statuses": status,
          }
          report_root.mkdir(parents=True, exist_ok=True)
          with (report_root / 'security-summary.json').open('w', encoding='utf-8') as fh:
              json.dump(summary, fh, indent=2)
          PY""")

with open(".github/workflows/ci-security.yml", "w") as f:
    f.write(content)
