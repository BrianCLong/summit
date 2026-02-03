import os
import re
import sys


def check_file(filepath):
    issues = []
    try:
        with open(filepath, encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return issues

    # We only care if this looks like an OIDC role definition for GitHub Actions.
    if 'token.actions.githubusercontent.com:sub' in content:
        # Check for pull_request in the subject claim
        # Looks for "repo:..." followed by ":pull_request" within the same line/string context
        if re.search(r'repo:[^"\n]+:pull_request', content):
            issues.append("Found 'pull_request' in OIDC subject claim. This allows PRs to assume the role.")

        # Check for audience check
        # We expect verification that aud is sts.amazonaws.com
        if 'token.actions.githubusercontent.com:aud' in content:
            if 'sts.amazonaws.com' not in content:
                 issues.append("Audience 'sts.amazonaws.com' not found or not correctly assigned to 'aud' claim.")
        else:
             issues.append("Audience 'aud' claim not found.")

    return issues

def main():
    has_error = False
    start_dir = "."
    # print(f"Scanning .tf files in {os.path.abspath(start_dir)}...")

    for root, dirs, files in os.walk(start_dir):
        for file in files:
            if file.endswith(".tf"):
                filepath = os.path.join(root, file)
                issues = check_file(filepath)
                if issues:
                    print(f"\n[FAIL] {filepath}")
                    for issue in issues:
                        print(f"  - {issue}")
                    has_error = True

    if has_error:
        print("\nOIDC Trust Lint FAILED: Found overly permissive trust policies.")
        sys.exit(1)
    else:
        print("\nOIDC Trust Lint PASSED.")
        sys.exit(0)

if __name__ == "__main__":
    main()
