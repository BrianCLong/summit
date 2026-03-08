#!/usr/bin/env python3
import argparse
import datetime
import json
import sys

"""
Attestation TTL Guard
Ensures that the Sigstore attestation bundle is fresh (e.g., <= 24h old).
Fails if the integrated time in the Rekor bundle is too old or missing.
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", required=True, help="Path to the Sigstore bundle JSON")
    ap.add_argument("--max-age-hours", type=int, default=24, help="Maximum allowed age in hours")
    args = ap.parse_args()

    try:
        with open(args.bundle) as f:
            b = json.load(f)
    except Exception as e:
        print(f"Error reading bundle file: {e}")
        sys.exit(1)

    # cosign bundle carries Rekor inclusion data with integratedTime
    integrated = None
    try:
        # Check standard cosign bundle format
        if (
            "rekorBundle" in b
            and "Payload" in b["rekorBundle"]
            and "integratedTime" in b["rekorBundle"]["Payload"]
        ):
            integrated = int(b["rekorBundle"]["Payload"]["integratedTime"])
        # Check alternate format (sometimes nested differently)
        elif "verificationMaterial" in b and "tlogEntries" in b["verificationMaterial"]:
            # Take the latest entry if multiple exist
            times = [
                int(entry.get("integratedTime", 0))
                for entry in b["verificationMaterial"]["tlogEntries"]
            ]
            if times:
                integrated = max(times)
    except Exception as e:
        print(f"Error extracting timestamp from bundle: {e}")
        sys.exit(1)

    if integrated is None:
        print("❌ No Rekor inclusion time found in bundle; failing closed.")
        sys.exit(1)

    # Convert timestamp to UTC datetime
    # integratedTime is usually seconds since epoch
    try:
        ts = datetime.datetime.fromtimestamp(integrated, datetime.UTC)
        now = datetime.datetime.now(datetime.UTC)
    except Exception as e:
        print(f"Error processing timestamps: {e}")
        sys.exit(1)

    age_delta = now - ts
    age_hours = age_delta.total_seconds() / 3600.0

    print(f"Attestation timestamp: {ts.isoformat()}")
    print(f"Current UTC time:     {now.isoformat()}")
    print(f"Attestation age:      {age_hours:.2f} hours")

    if age_hours > args.max_age_hours:
        print(f"❌ Attestation too old: {age_hours:.1f}h > {args.max_age_hours}h")
        sys.exit(1)

    print(f"✅ Attestation is fresh (age <= {args.max_age_hours}h).")


if __name__ == "__main__":
    main()
