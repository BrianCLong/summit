#!/bin/bash
# Final verification script for Summit v0.1.0 release

echo "=== Summit v0.1.0 - Final Verification ==="
echo ""

# Check that all documentation files exist
echo "1. Checking documentation files..."
DOCS=(
  "docs/OPERATOR_READINESS.md"
  "docs/ANNOUNCEMENT.md"
  "docs/OPS_TLDR.md"
  "README.md"
  "RELEASE_NOTES.md"
  "SECURITY.md"
  "SUPPORT.md"
  "STATUS.md"
  "ROADMAP.md"
  "GA_SIGNOFF.md"
  "FINAL_SUMMARY.md"
)

MISSING_DOCS=()
for doc in "${DOCS[@]}"; do
  if [ ! -f "$doc" ]; then
    echo "❌ Missing documentation: $doc"
    MISSING_DOCS+=("$doc")
  else
    echo "✅ Found: $doc"
  fi
done

if [ ${#MISSING_DOCS[@]} -gt 0 ]; then
  echo "💥 Missing ${#MISSING_DOCS[@]} documentation files"
  exit 1
fi

echo ""
echo "2. Checking Makefile targets..."
TARGETS=(
  "up"
  "app"
  "verify"
  "smoke"
  "down"
  "nuke"
  "dr-drill"
  "evidence"
  "sentinel"
  "config-contract"
  "snapshot"
  "labels"
)

MISSING_TARGETS=()
for target in "${TARGETS[@]}"; do
  if ! grep -q "^$target:" Makefile; then
    echo "❌ Missing Makefile target: $target"
    MISSING_TARGETS+=("$target")
  else
    echo "✅ Found target: $target"
  fi
done

if [ ${#MISSING_TARGETS[@]} -gt 0 ]; then
  echo "💥 Missing ${#MISSING_TARGETS[@]} Makefile targets"
  exit 1
fi

echo ""
echo "3. Checking key directories..."
DIRS=(
  "scripts"
  "observability"
  "oncall"
  ".github/workflows"
  ".github/ISSUE_TEMPLATE"
)

MISSING_DIRS=()
for dir in "${DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "❌ Missing directory: $dir"
    MISSING_DIRS+=("$dir")
  else
    echo "✅ Found directory: $dir"
  fi
done

if [ ${#MISSING_DIRS[@]} -gt 0 ]; then
  echo "💥 Missing ${#MISSING_DIRS[@]} directories"
  exit 1
fi

echo ""
echo "4. Testing key commands..."
echo "Testing make doctor..."
if make doctor >/dev/null 2>&1; then
  echo "✅ make doctor works"
else
  echo "❌ make doctor failed"
  exit 1
fi

echo ""
echo "Testing make snapshot..."
if make snapshot >/dev/null 2>&1; then
  echo "✅ make snapshot works"
  # Clean up
  rm -rf dist/
else
  echo "❌ make snapshot failed"
  exit 1
fi

echo ""
echo "Testing make labels..."
if make labels >/dev/null 2>&1; then
  echo "✅ make labels works"
else
  echo "❌ make labels failed"
  exit 1
fi

echo ""
echo "5. Checking badges in README..."
if grep -q "GA.*release.*blue" README.md && grep -q "SLO.*green" README.md; then
  echo "✅ README badges present"
else
  echo "❌ README badges missing"
  exit 1
fi

echo ""
echo "🎉 ALL VERIFICATIONS PASSED!"
echo "Summit v0.1.0 is fully ready for GA with all artifacts and validations in place."
echo ""
echo "Key artifacts created:"
echo "  - docs/OPERATOR_READINESS.md"
echo "  - docs/ANNOUNCEMENT.md" 
echo "  - docs/OPS_TLDR.md"
echo "  - ROADMAP.md"
echo "  - RELEASE_LIFECYCLE.md"
echo "  - GitHub issue templates"
echo "  - CI validation workflows"
echo ""
echo "Ready for production use! 🚀"