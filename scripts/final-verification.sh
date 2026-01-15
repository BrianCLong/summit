#!/usr/bin/env bash
# Final verification script for Maestro Conductor GA release v2025.10.07

set -euo pipefail

echo "🔍 Final Verification for Maestro Conductor GA Release v2025.10.07"
echo "==============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC} - $message"
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC} - $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC} - $message"
            ;;
    esac
}

# Counter for results
passed=0
failed=0
warnings=0

# 1. Check that all required files exist
echo -e "\n${BLUE}📁 Checking required files...${NC}"

required_files=(
    "docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md"
    "docs/releases/ga-signoff/GA_SIGNOFF_SHEET.md"
    "docs/releases/ga-signoff/GA_QUICK_SIGNOFF.md"
    "docs/releases/2025.10.07_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md"
    "MAESTRO_CONDUCTOR_GA_SUMMARY.md"
    "dist/release-manifest-v2025.10.07.yaml"
    "dist/release-attestation-v2025.10.07.jsonld"
    "dist/evidence-v0.3.2-mc-nightly.json"
    ".github/workflows/release-artifacts.yml"
    ".github/workflows/check-ga-packet.yml"
    "scripts/gen-release-manifest.mjs"
    "scripts/gen-release-attestation.mjs"
    "scripts/verify-release-manifest.mjs"
    "scripts/check-ga-packet.sh"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        print_status "PASS" "Found $file"
        ((passed++))
    else
        print_status "FAIL" "Missing $file"
        ((failed++))
    fi
done

# 2. Check that key scripts are executable
echo -e "\n${BLUE}🔧 Checking script permissions...${NC}"

executable_scripts=(
    "scripts/gen-release-manifest.mjs"
    "scripts/gen-release-attestation.mjs"
    "scripts/verify-release-manifest.mjs"
    "scripts/check-ga-packet.sh"
)

for script in "${executable_scripts[@]}"; do
    if [[ -x "$script" ]]; then
        print_status "PASS" "$script is executable"
        ((passed++))
    else
        print_status "FAIL" "$script is not executable"
        ((failed++))
    fi
done

# 3. Verify that the release manifest contains the expected artifacts
echo -e "\n${BLUE}📋 Checking release manifest contents...${NC}"

if grep -q "release_version: v2025.10.07" dist/release-manifest-v2025.10.07.yaml; then
    print_status "PASS" "Manifest contains correct release version"
    ((passed++))
else
    print_status "FAIL" "Manifest missing correct release version"
    ((failed++))
fi

if grep -q "evidence_bundle:" dist/release-manifest-v2025.10.07.yaml; then
    print_status "PASS" "Manifest contains evidence bundle section"
    ((passed++))
else
    print_status "FAIL" "Manifest missing evidence bundle section"
    ((failed++))
fi

# 4. Verify that the GA announcement contains links to all artifacts
echo -e "\n${BLUE}🔗 Checking GA announcement links...${NC}"

announcement="docs/releases/2025.10.07_MAESTRO_CONDUCTOR_GA_ANNOUNCEMENT.md"

if grep -q "Post-GA Hardening" "$announcement"; then
    print_status "PASS" "Announcement contains Post-GA Hardening section"
    ((passed++))
else
    print_status "FAIL" "Announcement missing Post-GA Hardening section"
    ((failed++))
fi

# 5. Verify that the GA packet contains all required sections
echo -e "\n${BLUE}📄 Checking GA packet sections...${NC}"

ga_packet="docs/releases/ga-signoff/GA_SIGNOFF_PACKET.md"

if grep -q "Go / No‑Go Checklist" "$ga_packet"; then
    print_status "PASS" "GA packet contains Go/No-Go Checklist"
    ((passed++))
else
    print_status "FAIL" "GA packet missing Go/No-Go Checklist"
    ((failed++))
fi

if grep -q "Final Hardening" "$ga_packet"; then
    print_status "PASS" "GA packet contains Final Hardening section"
    ((passed++))
else
    print_status "WARN" "GA packet missing Final Hardening section"
    ((warnings++))
fi

if grep -q "Acceptance Criteria" "$ga_packet"; then
    print_status "PASS" "GA packet contains Acceptance Criteria"
    ((passed++))
else
    print_status "FAIL" "GA packet missing Acceptance Criteria"
    ((failed++))
fi

# 6. Verify package.json scripts
echo -e "\n${BLUE}📦 Checking package.json scripts...${NC}"

if npm run | grep -q "release:manifest"; then
    print_status "PASS" "package.json contains release:manifest script"
    ((passed++))
else
    print_status "FAIL" "package.json missing release:manifest script"
    ((failed++))
fi

if npm run | grep -q "release:attest"; then
    print_status "PASS" "package.json contains release:attest script"
    ((passed++))
else
    print_status "FAIL" "package.json missing release:attest script"
    ((failed++))
fi

if npm run | grep -q "release:verify"; then
    print_status "PASS" "package.json contains release:verify script"
    ((passed++))
else
    print_status "FAIL" "package.json missing release:verify script"
    ((failed++))
fi

# 7. Verify Makefile targets
echo -e "\n${BLUE}🔨 Checking Makefile targets...${NC}"

if make -qp | grep -q "release.manifest"; then
    print_status "PASS" "Makefile contains release.manifest target"
    ((passed++))
else
    print_status "FAIL" "Makefile missing release.manifest target"
    ((failed++))
fi

if make -qp | grep -q "release.attest"; then
    print_status "PASS" "Makefile contains release.attest target"
    ((passed++))
else
    print_status "FAIL" "Makefile missing release.attest target"
    ((failed++))
fi

if make -qp | grep -q "release.verify"; then
    print_status "PASS" "Makefile contains release.verify target"
    ((passed++))
else
    print_status "FAIL" "Makefile missing release.verify target"
    ((failed++))
fi

# Final summary
echo -e "\n${BLUE}🏁 Final Verification Summary${NC}"
echo "=================================="
echo -e "${GREEN}✅ Passed: $passed${NC}"
echo -e "${RED}❌ Failed: $failed${NC}"
echo -e "${YELLOW}⚠️  Warnings: $warnings${NC}"

if [[ $failed -eq 0 ]]; then
    echo -e "\n${GREEN}🎉 All verification checks passed! Maestro Conductor GA Release v2025.10.07 is ready.${NC}"
    echo -e "${BLUE}🚀 Next steps:${NC}"
    echo "1. Push the v2025.10.07 tag to trigger the GitHub workflow"
    echo "2. Verify that all artifacts are generated and attached to the GitHub Release"
    echo "3. Publish the GA announcement to selected channels"
    echo "4. Monitor the release in production"
    exit 0
else
    echo -e "\n${RED}❌ Some verification checks failed. Please review the output above and fix the issues.${NC}"
    exit 1
fi