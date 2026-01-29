#!/usr/bin/env python3
import os
import sys
import re
import json

# verify_n8n_safe.sh (Python implementation)
# Scans for vulnerable n8n versions (CVE-2026-21858).
# Vulnerable range: 1.65.0 <= v < 1.121.0

MIN_SAFE_VERSION = (1, 121, 0)
VULN_RANGE_START = (1, 65, 0)

exit_code = 0

def parse_version(v_str):
    """Parses a semver-like string into a tuple of integers."""
    # Remove semver prefixes
    clean = re.sub(r'[\^~>=<v]', '', v_str)
    # Extract X.Y.Z
    match = re.search(r'(\d+)\.(\d+)\.(\d+)', clean)
    if match:
        return tuple(map(int, match.groups()))
    return None

def check_version(v_tuple, location):
    global exit_code
    if not v_tuple:
        return

    # Check vulnerability range: 1.65.0 <= v < 1.121.0
    if v_tuple >= VULN_RANGE_START and v_tuple < MIN_SAFE_VERSION:
        version_str = '.'.join(map(str, v_tuple))
        safe_str = '.'.join(map(str, MIN_SAFE_VERSION))
        print(f"❌ CRITICAL: Vulnerable n8n version {version_str} found in {location}")
        print(f"   Fix: Upgrade to >={safe_str} immediately.")
        exit_code = 1
    else:
        version_str = '.'.join(map(str, v_tuple))
        print(f"✅ Found n8n version {version_str} in {location} (Safe)")

def scan_package_json():
    print("Checking package.json files...")
    for root, dirs, files in os.walk("."):
        if "node_modules" in dirs:
            dirs.remove("node_modules") # Optimization
        for file in files:
            if file == "package.json":
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        deps = data.get("dependencies", {})
                        devDeps = data.get("devDependencies", {})
                        all_deps = {**deps, **devDeps}

                        if "n8n" in all_deps:
                            v_str = all_deps["n8n"]
                            v_tuple = parse_version(v_str)
                            if v_tuple:
                                check_version(v_tuple, path)
                            else:
                                print(f"⚠️  WARNING: Could not parse n8n version '{v_str}' in {path}")
                except Exception as e:
                    # Ignore non-JSON files or errors
                    pass

def scan_docker_compose():
    print("Checking docker-compose files...")
    # Regex to capture image name and optional tag
    # Matches: image: n8nio/n8n:1.0.0, image: "n8nio/n8n", image: n8n
    image_pattern = re.compile(r'image:\s*["\']?(?:[\w\-]+(?:/[\w\-]+)*/)?n8n(?::([\w\.\-]+))?["\']?')

    for root, dirs, files in os.walk("."):
        for file in files:
            if file.startswith("docker-compose") and (file.endswith(".yml") or file.endswith(".yaml")):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        for line_num, line in enumerate(f, 1):
                            # Skip comments
                            if line.strip().startswith('#'):
                                continue

                            match = image_pattern.search(line)
                            if match:
                                tag = match.group(1)
                                if not tag or tag == "latest":
                                    print(f"❌ ERROR: n8n using 'latest' or implicit tag in {path}:{line_num}")
                                    print(f"   Requirement: Pin to >= 1.121.0 to ensure patch.")
                                    global exit_code
                                    exit_code = 1
                                else:
                                    v_tuple = parse_version(tag)
                                    if v_tuple:
                                        check_version(v_tuple, f"{path}:{line_num}")
                except Exception as e:
                    print(f"Error reading {path}: {e}")

if __name__ == "__main__":
    print("🔍 Scanning for vulnerable n8n instances (CVE-2026-21858)...")
    scan_package_json()
    scan_docker_compose()

    if exit_code == 0:
        print("✅ No vulnerable n8n versions detected.")
    else:
        print("❌ Security Check Failed.")

    sys.exit(exit_code)
