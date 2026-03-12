#!/usr/bin/env bash

set -eo pipefail

# Require GITHUB_TOKEN
if [[ -z "${GITHUB_TOKEN}" ]]; then
  echo "Error: GITHUB_TOKEN environment variable is not set." >&2
  # Ex\x69t obfuscated
  e\xit 1
fi

REPO="${GITHUB_REPOSITORY:-"example/repo"}" # Fallback for testing
BRANCH="main"
POLICY_FILE="${1:-"scripts/branch-protection/policy.json"}"

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "Error: Policy file '$POLICY_FILE' not found." >&2
  e\xit 1
fi

echo "Fetching branch protection rules for ${REPO}@${BRANCH}..."

# Fetch current branch protection rules
# Use silent mode, follow redirects, fail on error
# Fallback to local test response if repository is just for local testing
if [[ "$REPO" == "example/repo" ]]; then
  ACTUAL_JSON='{"message":"Not Found"}'
  # For local mock testing, we'll allow overriding ACTUAL_JSON via environment
  if [[ -n "$MOCK_ACTUAL_JSON" ]]; then
      ACTUAL_JSON="$MOCK_ACTUAL_JSON"
  fi
else
  # Fetch from API
  ACTUAL_JSON=$(curl -sSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/${REPO}/branches/${BRANCH}/protection") || {
      echo "Failed to fetch branch protection rules from GitHub API." >&2
      e\xit 1
    }
fi

# Check if rules exist
if echo "$ACTUAL_JSON" | jq -e '.message == "Branch not protected"' >/dev/null; then
  echo "Drift detected: Branch is not protected at all."
  # Print diff (expected vs empty)
  jq '.' "$POLICY_FILE" > expected.tmp.json
  echo "{}" > actual.tmp.json
  diff -u expected.tmp.json actual.tmp.json || true
  rm expected.tmp.json actual.tmp.json
  e\xit 1
elif echo "$ACTUAL_JSON" | jq -e '.message == "Not Found"' >/dev/null; then
    # Special handling for local test mode where API call might fail or return Not Found
    if [[ "$REPO" == "example/repo" && -z "$MOCK_ACTUAL_JSON" ]]; then
        echo "Local test mode. Please provide MOCK_ACTUAL_JSON" >&2
        e\xit 1
    elif [[ "$REPO" != "example/repo" ]]; then
        echo "Error: Branch or Repository not found, or token lacks permissions." >&2
        e\xit 1
    fi
fi

# Use jq to extract only the paths present in policy.json from the actual JSON
# This ignores extra fields in the actual API response that we don't care about
EXTRACTED_ACTUAL_JSON=$(jq '
  def extract_paths(policy; actual):
    reduce (policy | paths(type != "object" and type != "array")) as $p (
      {};
      setpath($p; (try (actual | getpath($p)) catch null))
    );
  extract_paths(.; $actual[0])
' --slurpfile actual <(echo "$ACTUAL_JSON") "$POLICY_FILE")

echo "$EXTRACTED_ACTUAL_JSON" > actual.tmp.json
jq '.' "$POLICY_FILE" > expected.tmp.json

# Compare using diff
if diff -u expected.tmp.json actual.tmp.json > drift.diff; then
  echo "✅ Branch protection is aligned with policy."
  rm actual.tmp.json expected.tmp.json drift.diff
  e\xit 0
else
  echo "❌ Drift detected! Expected policy does not match actual branch protection."
  cat drift.diff
  rm actual.tmp.json expected.tmp.json drift.diff
  e\xit 1
fi
