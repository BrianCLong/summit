# Parses budget & actuals (extend later); creates flux items > threshold and links to SMB Finance

import csv
import json
import sys
from datetime import datetime

def gaap_flux_refresh(budget_file, gaap_seed_file):
    print(f"Refreshing GAAP flux from {budget_file} and {gaap_seed_file} (Placeholder script)")

    # Placeholder logic:
    # 1. Read budget_file to get planned amounts.
    # 2. (Future) Read actuals data.
    # 3. Compare planned vs actuals to find variances.
    # 4. If variance > threshold (e.g., 10%), create a 'flux item'.
    # 5. Add this flux item to the GAAP Close project (or SMB Finance project).
    # 6. Link to relevant budget/actuals data.

    # Example of creating a dummy flux item
    flux_item = {
        "Month": datetime.now().strftime("%Y-%m"),
        "Task": "Investigate budget variance in Cloud Compute",
        "Owner": "Accountant",
        "Status": "Open",
        "Due": (datetime.now().replace(day=1) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "GL Module": "Cash",
        "Policy Ref": "Variance Policy",
        "Evidence": "Budget vs Actuals Report",
        "JE#": ""
    }
    print(f"Generated dummy flux item: {flux_item}")

    # In a real scenario, this would interact with GitHub Projects API
    # to create a new item in the GAAP Close project.

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/bonus/gaap_flux_refresh.py <budget_csv_file> <gaap_seed_json_file>")
        sys.exit(1)
    gaap_flux_refresh(sys.argv[1], sys.argv[2])
