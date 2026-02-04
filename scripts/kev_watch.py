#!/usr/bin/env python3
import glob
import json
import os
import sys

import requests

# CISA KEV Catalog URL
KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

def fetch_kev_catalog():
    """Fetches the latest KEV catalog from CISA."""
    try:
        print(f"Fetching KEV catalog from {KEV_URL}...")
        response = requests.get(KEV_URL, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching KEV catalog: {e}")
        sys.exit(1)

def load_vuln_report(report_path):
    """Loads the vulnerability report from the specified path."""
    # If path is a directory, find the latest json file
    if os.path.isdir(report_path):
        files = glob.glob(os.path.join(report_path, "*.json"))
        # Filter for files that look like matches or reports
        # scripts/scan-vulnerabilities.sh produces vulnerability-matches-TIMESTAMP.json
        match_files = [f for f in files if "vulnerability-matches" in f]
        if not match_files:
            print(f"No vulnerability-matches-*.json files found in {report_path}")
            sys.exit(1)
        # Sort by modification time, newest first
        report_path = max(match_files, key=os.path.getmtime)
        print(f"Using latest vulnerability report: {report_path}")

    try:
        with open(report_path) as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading vulnerability report {report_path}: {e}")
        sys.exit(1)

def find_kev_matches(kev_data, vuln_data):
    """Finds intersections between KEV catalog and local vulnerabilities."""
    kev_cves = {vuln['cveID']: vuln for vuln in kev_data['vulnerabilities']}

    matches = []

    # Grype output structure: {"matches": [{"vulnerability": {"id": "CVE-..."}}]}
    if 'matches' not in vuln_data:
        print("Invalid vulnerability report format: 'matches' key missing")
        return []

    for item in vuln_data['matches']:
        vuln_id = item.get('vulnerability', {}).get('id')
        if vuln_id and vuln_id in kev_cves:
            kev_entry = kev_cves[vuln_id]
            matches.append({
                'cve': vuln_id,
                'package': item.get('artifact', {}).get('name'),
                'version': item.get('artifact', {}).get('version'),
                'location': item.get('artifact', {}).get('locations', []),
                'kev_info': kev_entry
            })

    return matches

def create_github_issue(match):
    """Creates a GitHub issue for a detected KEV match."""
    github_token = os.environ.get('GITHUB_TOKEN')
    repo = os.environ.get('GITHUB_REPOSITORY')

    if not github_token or not repo:
        print("GITHUB_TOKEN or GITHUB_REPOSITORY not set. Skipping issue creation.")
        return

    cve_id = match['cve']
    package = match['package']
    kev_info = match['kev_info']

    title = f"KEV Alert: {cve_id} in {package} - Active Exploitation Detected"

    body = f"""
## 🚨 KEV Alert: Active Exploitation Detected

**Vulnerability:** {cve_id}
**Package:** {package} (Version: {match['version']})
**Severity:** {kev_info.get('severity', 'Unknown')}

### CISA KEV Details
* **Vendor/Project:** {kev_info.get('vendorProject')}
* **Product:** {kev_info.get('product')}
* **Date Added:** {kev_info.get('dateAdded')}
* **Due Date:** {kev_info.get('dueDate')}
* **Description:** {kev_info.get('shortDescription')}
* **Required Action:** {kev_info.get('requiredAction')}

### Locations
{json.dumps(match['location'], indent=2)}

### Guidance
This vulnerability is listed in the CISA Known Exploited Vulnerabilities Catalog.
This indicates **active exploitation in the wild**.
Immediate action is required to remediate this vulnerability.

[View CISA KEV Entry](https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext={cve_id})
    """

    url = f"https://api.github.com/repos/{repo}/issues"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    data = {
        "title": title,
        "body": body,
        "labels": ["security", "KEV", "high-priority"]
    }

    # Check if issue already exists to avoid duplicates
    # Simple check based on title search
    search_url = "https://api.github.com/search/issues"
    search_params = {
        "q": f"repo:{repo} state:open \"{title}\""
    }
    try:
        search_resp = requests.get(search_url, headers=headers, params=search_params)
        if search_resp.status_code == 200 and search_resp.json().get('total_count', 0) > 0:
            print(f"Issue for {cve_id} already exists. Skipping.")
            return
    except Exception as e:
        print(f"Error checking for existing issues: {e}")

    try:
        resp = requests.post(url, headers=headers, json=data)
        if resp.status_code == 201:
            print(f"Created issue for {cve_id}: {resp.json().get('html_url')}")
        else:
            print(f"Failed to create issue for {cve_id}: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Error creating issue: {e}")

def main():
    if len(sys.argv) < 2:
        report_path = "./vulnerability-reports"
    else:
        report_path = sys.argv[1]

    print("Starting KEV Watch...")

    kev_data = fetch_kev_catalog()
    vuln_data = load_vuln_report(report_path)

    matches = find_kev_matches(kev_data, vuln_data)

    if matches:
        print(f"\n🚨 FOUND {len(matches)} KEV MATCHES! 🚨\n")
        for match in matches:
            print(f" - {match['cve']} in {match['package']} {match['version']}")
            create_github_issue(match)
        sys.exit(1) # Exit with failure to indicate issues found (optional, depending on pipeline needs)
    else:
        print("\n✅ No KEV matches found in dependencies.")
        sys.exit(0)

if __name__ == "__main__":
    main()
