#!/usr/bin/env python3
import csv
import subprocess
import sys
import time

REPO = "BrianCLong/summit"
CSV_FILE = "october2025/october_master_issues.csv"
PROJECT_ID = "8"
OWNER = "BrianCLong"

def create_issue(title, body, labels):
    """Create a GitHub issue and return the URL"""
    cmd = [
        "gh", "issue", "create",
        "--repo", REPO,
        "--title", title,
        "--body", body,
        "--label", labels
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        # Extract URL from output
        for line in result.stdout.split('\n'):
            if 'https://github.com' in line:
                return line.strip()
        return None
    except subprocess.CalledProcessError as e:
        print(f"  ❌ Error: {e.stderr}")
        return None

def add_to_project(issue_url):
    """Add issue to Project #8"""
    cmd = [
        "gh", "project", "item-add", PROJECT_ID,
        "--owner", OWNER,
        "--url", issue_url
    ]

    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True
    except subprocess.CalledProcessError:
        return False

def main():
    print("📋 Importing October Master Plan issues from CSV...")

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            title = row['Title'].strip()
            body = row['Body'].strip()
            labels = row['Labels'].strip()

            print(f"\nCreating: {title}")

            issue_url = create_issue(title, body, labels)

            if issue_url:
                print(f"  ✅ Created: {issue_url}")

                if add_to_project(issue_url):
                    print(f"  ✅ Added to Project #{PROJECT_ID}")
                else:
                    print(f"  ⚠️  Could not add to project")
            else:
                print(f"  ❌ Failed to create issue")

            time.sleep(1)  # Rate limit protection

    print("\n✅ Import complete!")

if __name__ == "__main__":
    main()
