#!/bin/bash
set -e

# scripts/release/verify.sh
# Verifies the integrity of release artifacts.
# Usage: ./verify.sh [DIR] [--strict] [--source owner/repo] [--tag vX.Y.Z]

usage() {
    echo "Usage: $0 [DIR] [options]"
    echo "Options:"
    echo "  --strict                Enforce presence of all artifacts and tools"
    echo "  --source <owner/repo>   Expected source repository (for provenance)"
    echo "  --tag <version>         Expected tag (for provenance)"
    echo "  --help                  Show this message"
    exit 1
}

RELEASE_DIR="dist"
STRICT=false
SOURCE_REPO=""
TAG=""

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --strict) STRICT=true; shift ;;
        --source) SOURCE_REPO="$2"; shift 2 ;;
        --tag) TAG="$2"; shift 2 ;;
        --help) usage ;;
        -*) echo "Unknown option: $1"; usage ;;
        *) RELEASE_DIR="$1"; shift ;;
    esac
done

echo "🔍 Verifying release artifacts in: $RELEASE_DIR"
[ "$STRICT" = true ] && echo "🛡️  Strict Mode: ENABLED"

if [ ! -d "$RELEASE_DIR" ]; then
    echo "❌ Release directory '$RELEASE_DIR' not found."
    exit 1
fi

# 1. Verify Digests
if [ -f "$RELEASE_DIR/checksums.txt" ]; then
    echo "🔐 Verifying checksums..."
    cd "$RELEASE_DIR"
    if sha256sum -c checksums.txt 2>/dev/null || shasum -a 256 -c checksums.txt; then
        echo "✅ Digests match."
    else
        echo "❌ Digest verification FAILED."
        exit 1
    fi
    cd - > /dev/null
else
    echo "⚠️  No checksums.txt found."
    [ "$STRICT" = true ] && { echo "❌ Strict mode requires checksums.txt"; exit 1; }
fi

# 2. Verify SBOMs
REQUIRED_SBOMs=("sbom-source.spdx.json")
echo "📦 Checking for required SBOMs..."
MISSING_SBOM=0
for sbom in "${REQUIRED_SBOMs[@]}"; do
    if [ ! -f "$RELEASE_DIR/sbom/$sbom" ] && [ ! -f "$RELEASE_DIR/$sbom" ] && [ ! -f "$RELEASE_DIR/compliance/$sbom" ]; then
        echo "❌ Missing SBOM: $sbom"
        MISSING_SBOM=1
    else
        echo "✅ Found SBOM: $sbom"
    fi
done

if [ "$MISSING_SBOM" -eq 1 ]; then
    echo "❌ SBOM verification failed."
    exit 1
fi

# 3. Verify Provenance
echo "📜 Checking for Provenance..."
PROV_FILE=$(find "$RELEASE_DIR" -name "*.intoto.jsonl" | head -n 1)

if [ -n "$PROV_FILE" ]; then
    echo "✅ Found Provenance: $(basename "$PROV_FILE")"
    
    if command -v slsa-verifier &> /dev/null; then
        if [ -n "$SOURCE_REPO" ] && [ -n "$TAG" ]; then
            echo "🔍 Verifying provenance with slsa-verifier..."
            # Assuming the artifact to verify is the bundle tarball
            BUNDLE=$(find "$RELEASE_DIR" -name "compliance-bundle-*.tgz" | head -n 1)
            
            if [ -z "$BUNDLE" ]; then
                 echo "⚠️  Could not find compliance bundle to verify against provenance."
            else
                if slsa-verifier verify-artifact "$BUNDLE" \
                    --provenance-path "$PROV_FILE" \
                    --source-uri "github.com/$SOURCE_REPO" \
                    --source-tag "$TAG"; then
                    echo "✅ Cryptographic verification PASSED (OIDC Identity verified)"
                else
                    echo "❌ Cryptographic verification FAILED"
                    exit 1
                fi
            fi
        else
            echo "ℹ️  Skipping strict usage of slsa-verifier (missing --source or --tag)"
        fi
    else
        echo "⚠️  'slsa-verifier' not installed."
        [ "$STRICT" = true ] && { echo "❌ Strict mode requires slsa-verifier"; exit 1; }
    fi
else
    echo "❌ Missing Provenance file (*.intoto.jsonl)."
    [ "$STRICT" = true ] && exit 1
fi

echo "🎉 Release verification passed."
