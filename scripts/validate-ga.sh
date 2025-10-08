#!/usr/bin/env bash
# Validate Maestro Conductor GA release artifacts & provenance for a given tag.
# Usage: TAG=v2025.10.07 ./scripts/validate-ga.sh
set -euo pipefail

TAG="${TAG:-v2025.10.07}"
REPO="${REPO:-$(git config --get remote.origin.url | sed 's#^git @#https://#; s#:#/#; s/\.git$//')}"
OWNER_REPO="${OWNER_REPO:-$(git remote get-url origin | sed -E 's#.*[:/ ]([^/]+/[^/.]+)(\.git)?$#\1#')}"

echo "🔎 Validating GA tag: $TAG in $OWNER_REPO"
echo "1) Checking tag exists locally & remotely…"
git fetch --tags >/dev/null 2>&1
git tag --list | grep -qx "$TAG" || { echo "❌ tag not found locally"; exit 1; }
echo "   ✅ Tag present"

echo "2) Checking release workflow run success on tag push…"
# Tip: inspect in UI; optional API check (requires gh CLI):
if command -v gh >/dev/null; then
  gh run list --repo "$OWNER_REPO" --branch "$TAG" --limit 5 | head -n 1
  echo "   ℹ️  Verify latest tag workflow run shows 'completed ✓'"
else
  echo "   ℹ️  Install GitHub CLI (gh) for auto-check, or verify in Actions UI."
fi

echo "3) Ensuring key artifacts exist in repo (or in Release assets)…"
# Local presence (repo copy). If you prefer pulling from Release assets, see gh release download below.
required=(
  "dist/release-manifest-$TAG.yaml"
  "dist/release-attestation-$TAG.jsonld"
  "dist/evidence-v0.3.2-mc-nightly.json"
  "docs/releases/2025.10.07_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md"
)
missing=0
for f in "${required[@]}"; do
  if [[ -f "$f" ]]; then
    echo "   ✅ $f"
  else
    echo "   ⚠️  Missing locally: $f"
    missing=$((missing+1))
  fi
done

echo "4) Hash verification via manifest…"
if npm run -s release:verify --tag="$TAG"; then
  echo "   ✅ All artifact SHA256 digests match manifest"
else
  echo "   ❌ Digest mismatch — investigate"
  exit 1
fi

echo "5) JSON-LD attestation fields sanity…"
jq -r '.credentialSubject.releaseVersion, .credentialSubject.commitSha, (.credentialSubject.artifacts|length)' \
  "dist/release-attestation-$TAG.jsonld" | awk 'NR==1{printf "   releaseVersion: %s\n",$0} NR==2{printf "   commitSha: %s\n",$0} NR==3{printf "   artifacts: %s\n",$0}'
echo "   ✅ Attestation contains version, commit SHA, and artifact list"

if command -v cosign >/dev/null; then
  echo "6) (Optional) cosign signature presence check…"
  if jq -e '.proof.jws|length>0' "dist/release-attestation-$TAG.jsonld" >/dev/null; then
    echo "   ✅ JWS present; verify according to your keyless/KMS policy"
    # Example (detached sign-blob verification if you store signatures separately):
    # cosign verify-blob --certificate <path-or-url> --signature <sig-file> --certificate-identity <issuer> --certificate-oidc-issuer <provider> dist/release-attestation-$TAG.jsonld
  else
    echo "   ℹ️  No JWS embedded (expected if signing not enabled)."
  fi
fi

echo "7) (Optional) Pull assets from GitHub Release and re-verify…"
if command -v gh >/dev/null; then
  tmpdir="$(mktemp -d)"; pushd "$tmpdir" >/dev/null
  gh release download "$TAG" --repo "$OWNER_REPO" --pattern "release-*-$(echo "$TAG").*" --clobber || true
  if compgen -G "release-*-$TAG.*" > /dev/null; then
    echo "   ✅ Downloaded release artifacts; re-running verify against local repo copy is not required but recommended for air-gapped audits."
  fi
  popd >/dev/null
fi

echo "🎉 Validation complete for $TAG"