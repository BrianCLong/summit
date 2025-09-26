#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import hashlib
import sys
import requests
import pathlib

def run_command(cmd, check=True, capture_output=True):
    result = subprocess.run(cmd, shell=True, check=check, capture_output=capture_output, text=True)
    return result.stdout.strip()

def sha256_file(filepath):
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk: break
            hasher.update(chunk)
    return hasher.hexdigest()

def main():
    parser = argparse.ArgumentParser(description="Verify GitHub Release assets.")
    parser.add_argument("tag", help="Release tag (e.g., v0.3.2-mc)")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY"),
                        help="GitHub repository (e.g., owner/repo). Defaults to GITHUB_REPOSITORY env var.")
    parser.add_argument("--require", nargs='*', default=[],
                        help="List of required asset names to verify.")
    args = parser.parse_args()

    if not args.repo:
        print("❌ Error: GitHub repository not specified. Set GITHUB_REPOSITORY env var or use --repo.")
        sys.exit(1)

    print(f"🔍 Verifying release {args.tag} for {args.repo}...")

    try:
        # Fetch release info
        release_info_json = run_command(f"gh api \"repos/{args.repo}/releases/tags/{args.tag}\"" )
        release_info = json.loads(release_info_json)
        assets = release_info.get("assets", [])

        # Create a temp directory for downloads
        temp_dir = pathlib.Path(f"./.release_verify_temp_{args.tag}")
        temp_dir.mkdir(exist_ok=True)

        # Find and download SHA256SUMS
        sha_sums_asset = next((a for a in assets if a["name"] == "SHA256SUMS"), None)
        if not sha_sums_asset:
            print("❌ Verification failed: SHA256SUMS asset not found in release.")
            run_command(f"rm -rf {temp_dir}", check=False)
            sys.exit(1)
        
        sha_sums_path = temp_dir / "SHA256SUMS"
        run_command(f"curl -L -o {sha_sums_path} {sha_sums_asset["browser_download_url"]}")
        
        expected_hashes = {}
        with open(sha_sums_path, 'r') as f:
            for line in f:
                parts = line.split()
                if len(parts) == 2:
                    expected_hashes[parts[1]] = parts[0]

        all_verified = True
        verified_assets = set()

        # Download and verify assets listed in SHA256SUMS
        for asset_name_in_sums, expected_hash in expected_hashes.items():
            if asset_name_in_sums == "SHA256SUMS": continue

            asset = next((a for a in assets if a["name"] == asset_name_in_sums), None)
            if not asset:
                print(f"❌ Required asset {asset_name_in_sums} not found in release assets.")
                all_verified = False
                continue

            asset_path = temp_dir / asset_name_in_sums
            print(f"  Downloading {asset_name_in_sums}...")
            run_command(f"curl -L -o {asset_path} {asset["browser_download_url"]}")

            calculated_hash = sha256_file(asset_path)

            if calculated_hash == expected_hash:
                print(f"  ✅ {asset_name_in_sums}: Hash matches.")
                verified_assets.add(asset_name_in_sums)
            else:
                print(f"  ❌ {asset_name_in_sums}: Hash MISMATCH. Expected: {expected_hash}, Got: {calculated_hash}")
                all_verified = False
        
        # Check if all required assets were verified
        missing_required = []
        for required_asset in args.require:
            if required_asset not in verified_assets:
                missing_required.append(required_asset)

        if missing_required:
            print(f"❌ Verification failed: Missing required assets: {', '.join(missing_required)}.")
            all_verified = False

        if all_verified:
            print(f"✅ Release {args.tag} assets successfully verified.")
            run_command(f"rm -rf {temp_dir}", check=False)
            sys.exit(0)
        else:
            print(f"❌ Release {args.tag} asset verification FAILED.")
            run_command(f"rm -rf {temp_dir}", check=False)
            sys.exit(1)

    except subprocess.CalledProcessError as e:
        print(f"❌ Error running gh CLI command: {e.stderr}")
        run_command(f"rm -rf {temp_dir}", check=False)
        sys.exit(1)
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        run_command(f"rm -rf {temp_dir}", check=False)
        sys.exit(1)

if __name__ == '__main__':
    main()