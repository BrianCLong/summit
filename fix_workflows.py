import re

def fix_ci_security():
    path = '.github/workflows/ci-security.yml'
    with open(path, 'r') as f:
        lines = f.readlines()

    # Mapping based on previously identified line numbers
    # 86, 144, 184, 219, 268, 295, 325, 351, 383, 422, 440, 486, 591 -> rename
    # 516 -> pattern

    # Actually, lines might shift if I edit, but replacing in place is fine if line count doesn't change.
    # I'll use a dictionary of line_index -> replacement

    replacements = {
        85: '          name: security-report-gitleaks\n', # 0-indexed: 86-1
        143: '          name: security-report-semgrep\n',
        183: '          name: security-report-snyk\n',
        218: '          name: security-report-trivy-fs\n',
        267: '          name: security-report-trivy-image\n',
        294: '          name: security-report-license\n',
        324: '          name: security-report-checkov\n',
        350: '          name: security-report-zizmor\n',
        382: '          name: security-report-opa\n',
        421: '          name: security-report-cis\n',
        439: '          name: security-report-baseline\n',
        485: '          name: security-report-dast\n',
        515: '          pattern: security-report-*\n', # Download step
        590: '          name: security-report-aggregated\n',
    }

    new_lines = []
    for i, line in enumerate(lines):
        if i in replacements:
            # Verify context to be sure
            if 'name: security-reports' in line:
                new_lines.append(replacements[i])
            else:
                print(f"Warning: Line {i+1} expected 'name: security-reports', found: {line.strip()}")
                new_lines.append(line)
        else:
            new_lines.append(line)

    with open(path, 'w') as f:
        f.writelines(new_lines)
    print("Fixed ci-security.yml")

def fix_pr_quality_gate():
    path = '.github/workflows/pr-quality-gate.yml'
    with open(path, 'r') as f:
        lines = f.readlines()

    new_lines = []
    in_longrun_job = False

    for i, line in enumerate(lines):
        if 'name: LongRunJob Spec Advisory Validation' in line:
            in_longrun_job = True

        if in_longrun_job and 'uses: actions/setup-node@' in line:
            # Check if we already inserted pnpm setup (idempotency check skipped for simplicity but good practice)
            # We want to insert before this line
            indent = line[:line.find('uses:')]
            new_lines.append(f'{indent}name: Install pnpm\n')
            new_lines.append(f'{indent}uses: pnpm/action-setup@v4\n')
            new_lines.append('\n')
            in_longrun_job = False # Reset to avoid inserting multiple times if multiple setup-node steps (unlikely here)

        # Fix SBOM script call
        if 'run: bash scripts/generate-sbom.sh . artifacts/sbom/sbom.json' in line:
            indent = line[:line.find('run:')]
            new_lines.append(f'{indent}run: |\n')
            new_lines.append(f'{indent}  mkdir -p artifacts/sbom\n')
            new_lines.append(f'{indent}  syft packages dir:. -o cyclonedx-json --file artifacts/sbom/sbom.json\n')
            continue # Skip adding the original line

        new_lines.append(line)

    with open(path, 'w') as f:
        f.writelines(new_lines)
    print("Fixed pr-quality-gate.yml")

if __name__ == '__main__':
    fix_ci_security()
    fix_pr_quality_gate()
