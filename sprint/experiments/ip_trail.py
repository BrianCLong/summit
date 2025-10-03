#!/usr/bin/env python3
import json
import sys
from pathlib import Path

def main():
    print("### IP/Compliance Delta")
    print("")
    
    # Count claims
    claims_path = Path("sprint/ip/claims.md")
    claims_count = 0
    if claims_path.exists():
        with open(claims_path) as f:
            claims_count = len([line for line in f.read().split('\n') if line.strip().startswith('#### Claim')])
    
    print(f"- Claims: {claims_count} claims")
    
    # Count prior art entries
    prior_art_path = Path("sprint/ip/prior_art.csv")
    prior_art_count = 0
    if prior_art_path.exists():
        with open(prior_art_path) as f:
            prior_art_count = len(f.readlines()) - 1  # Subtract header
    
    print(f"- Prior Art entries: {prior_art_count} rows")
    
    # Count SPDX packages
    sbom_path = Path("sprint/compliance/SBOM.spdx.json")
    package_count = 0
    if sbom_path.exists():
        try:
            with open(sbom_path) as f:
                sbom = json.load(f)
                package_count = len(sbom.get("packages", []))
        except:
            pass
    
    print(f"- SPDX packages: {package_count}")

if __name__ == "__main__":
    main()