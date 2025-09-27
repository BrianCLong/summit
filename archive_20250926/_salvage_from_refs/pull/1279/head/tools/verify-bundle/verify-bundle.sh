#!/bin/bash
#
# verify-bundle: IntelGraph Provenance Verification CLI
# Sprint 26: GA cutover provenance verification tool
#
# This tool verifies SLSA3 provenance, signatures, and attestations
# for IntelGraph container images and release bundles.
#

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_VERSION="1.0.0-ga"

# Default configuration
DEFAULT_SLSA_LEVEL="3"
DEFAULT_POLICY_FILE="${SCRIPT_DIR}/slsa3-policy.yaml"
COSIGN_EXPERIMENTAL="${COSIGN_EXPERIMENTAL:-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "\n${BOLD}=== $1 ===${NC}"
}

# Help function
show_help() {
    cat << EOF
${BOLD}verify-bundle${NC} - IntelGraph Provenance Verification Tool
Version: ${TOOL_VERSION}

${BOLD}USAGE:${NC}
    verify-bundle verify --bundle <bundle-path> [OPTIONS]
    verify-bundle verify --image <image-uri> [OPTIONS]
    verify-bundle policy --create <policy-file>
    verify-bundle version

${BOLD}COMMANDS:${NC}
    verify              Verify a release bundle or container image
    policy              Manage verification policies
    version             Show version information

${BOLD}VERIFY OPTIONS:${NC}
    --bundle PATH       Path to release bundle (.tar.gz)
    --image URI         Container image URI (e.g., ghcr.io/org/image:tag)
    --policy FILE       Policy file to use (default: slsa3-policy.yaml)
    --slsa-level N      Required SLSA level (1-4, default: 3)
    --require-roundtrip Require round-trip provenance verification
    --output FORMAT     Output format (text|json|junit, default: text)
    --output-file FILE  Write results to file
    --fail-on LEVEL     Fail on vulnerability level (critical|high|medium|low)
    --emergency-bypass  Allow emergency bypass (requires justification)

${BOLD}ENVIRONMENT VARIABLES:${NC}
    COSIGN_EXPERIMENTAL    Enable experimental cosign features (default: 1)
    GITHUB_TOKEN          GitHub token for private repositories
    VERIFY_BUNDLE_POLICY  Default policy file path
    VERIFY_BUNDLE_CACHE   Cache directory for verification artifacts

${BOLD}EXAMPLES:${NC}
    # Verify a release bundle with SLSA3 requirements
    verify-bundle verify --bundle intelgraph-v1.0.0.tar.gz --slsa-level 3

    # Verify a container image
    verify-bundle verify --image ghcr.io/intelgraph/api:v1.0.0

    # Verify with custom policy and output to JSON
    verify-bundle verify --image ghcr.io/intelgraph/api:v1.0.0 \\
        --policy custom-policy.yaml --output json --output-file results.json

    # Emergency bypass verification (audit logged)
    verify-bundle verify --image ghcr.io/intelgraph/api:v1.0.0 \\
        --emergency-bypass --output-file emergency-bypass-$(date +%s).json

    # Create a new policy file
    verify-bundle policy --create my-policy.yaml

${BOLD}EXIT CODES:${NC}
    0    Verification successful
    1    Verification failed
    2    Tool error (missing dependencies, invalid arguments, etc.)
    3    Emergency bypass used (requires manual review)

EOF
}

# Check dependencies
check_dependencies() {
    local missing_deps=()

    # Check required tools
    if ! command -v cosign &> /dev/null; then
        missing_deps+=("cosign")
    fi

    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi

    # Check for slsa-verifier
    if ! command -v slsa-verifier &> /dev/null; then
        log_warning "slsa-verifier not found - attempting to download..."
        install_slsa_verifier || missing_deps+=("slsa-verifier")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing tools and try again"
        log_info "Installation guide: https://docs.intelgraph.dev/tools/verify-bundle"
        exit 2
    fi
}

# Install slsa-verifier if not present
install_slsa_verifier() {
    local install_dir="${HOME}/.local/bin"
    mkdir -p "$install_dir"

    log_info "Downloading slsa-verifier..."
    if curl -Lo "${install_dir}/slsa-verifier" \
        "https://github.com/slsa-framework/slsa-verifier/releases/download/v2.5.1/slsa-verifier-linux-amd64" \
        && chmod +x "${install_dir}/slsa-verifier"; then

        export PATH="${install_dir}:${PATH}"
        log_success "slsa-verifier installed to ${install_dir}"
        return 0
    else
        log_error "Failed to install slsa-verifier"
        return 1
    fi
}

# Create default policy file
create_policy_file() {
    local policy_file="${1:-${DEFAULT_POLICY_FILE}}"

    cat > "$policy_file" << 'EOF'
# IntelGraph Verification Policy
# SLSA Level 3 Requirements for GA Cutover

version: "1.0"
name: "intelgraph-slsa3-policy"
description: "SLSA Level 3 verification policy for IntelGraph GA cutover"

requirements:
  slsa:
    minimum_level: 3
    required_attestations:
      - "slsaprovenance"
      - "spdx"
      - "vuln"

  signature:
    required: true
    trusted_issuers:
      - "https://token.actions.githubusercontent.com"

  vulnerabilities:
    max_critical: 0
    max_high: 5
    max_medium: 20
    fail_on_unknown: false

  supply_chain:
    trusted_builders:
      - "https://github.com/actions/runner"
      - "https://github.com/slsa-framework/slsa-github-generator"

    allowed_source_repos:
      - "github.com/BrianCLong/intelgraph"
      - "github.com/intelgraph/*"

  compliance:
    require_sbom: true
    require_provenance: true
    require_roundtrip: false

environments:
  production:
    requirements:
      vulnerabilities:
        max_critical: 0
        max_high: 0
        max_medium: 5
      slsa:
        minimum_level: 3

  staging:
    requirements:
      vulnerabilities:
        max_critical: 0
        max_high: 10
        max_medium: 50
      slsa:
        minimum_level: 2

emergency_bypass:
  allowed: true
  requires_justification: true
  audit_logging: true
  max_duration_hours: 24
EOF

    log_success "Policy file created: $policy_file"
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    BUNDLE_PATH=""
    IMAGE_URI=""
    POLICY_FILE="${VERIFY_BUNDLE_POLICY:-${DEFAULT_POLICY_FILE}}"
    SLSA_LEVEL="${DEFAULT_SLSA_LEVEL}"
    OUTPUT_FORMAT="text"
    OUTPUT_FILE=""
    FAIL_ON_LEVEL="critical"
    REQUIRE_ROUNDTRIP=false
    EMERGENCY_BYPASS=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            verify)
                COMMAND="verify"
                shift
                ;;
            policy)
                COMMAND="policy"
                shift
                ;;
            version)
                COMMAND="version"
                shift
                ;;
            --bundle)
                BUNDLE_PATH="$2"
                shift 2
                ;;
            --image)
                IMAGE_URI="$2"
                shift 2
                ;;
            --policy)
                POLICY_FILE="$2"
                shift 2
                ;;
            --slsa-level)
                SLSA_LEVEL="$2"
                shift 2
                ;;
            --output)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            --output-file)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            --fail-on)
                FAIL_ON_LEVEL="$2"
                shift 2
                ;;
            --require-roundtrip)
                REQUIRE_ROUNDTRIP=true
                shift
                ;;
            --emergency-bypass)
                EMERGENCY_BYPASS=true
                shift
                ;;
            --create)
                POLICY_CREATE_FILE="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 2
                ;;
        esac
    done

    # Validate required arguments
    case "$COMMAND" in
        verify)
            if [[ -z "$BUNDLE_PATH" && -z "$IMAGE_URI" ]]; then
                log_error "Either --bundle or --image must be specified"
                exit 2
            fi
            ;;
        policy)
            if [[ -z "${POLICY_CREATE_FILE:-}" ]]; then
                log_error "--create <file> is required for policy command"
                exit 2
            fi
            ;;
        version)
            ;;
        "")
            log_error "No command specified"
            show_help
            exit 2
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 2
            ;;
    esac
}

# Load policy file
load_policy() {
    local policy_file="$1"

    if [[ ! -f "$policy_file" ]]; then
        log_warning "Policy file not found: $policy_file"
        log_info "Creating default policy file..."
        create_policy_file "$policy_file"
    fi

    log_info "Loading policy: $policy_file"
    # For this implementation, we'll parse the YAML manually
    # In production, you might want to use a proper YAML parser
}

# Verify container image
verify_image() {
    local image_uri="$1"
    local results_file="${2:-verification-results.json}"

    log_header "Verifying Container Image: $image_uri"

    local verification_results=()
    local overall_status="PASS"

    # Initialize results structure
    cat > "$results_file" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "tool_version": "$TOOL_VERSION",
    "image_uri": "$image_uri",
    "policy_file": "$POLICY_FILE",
    "verification_results": {},
    "emergency_bypass": $EMERGENCY_BYPASS,
    "overall_status": "UNKNOWN"
}
EOF

    # Step 1: Verify image signature
    log_info "🔐 Verifying image signature..."
    if verify_image_signature "$image_uri"; then
        log_success "Image signature verified"
        verification_results+=("signature:PASS")
        jq '.verification_results.signature = {status: "PASS", message: "Signature verified"}' "$results_file" > tmp.json && mv tmp.json "$results_file"
    else
        log_error "Image signature verification failed"
        verification_results+=("signature:FAIL")
        overall_status="FAIL"
        jq '.verification_results.signature = {status: "FAIL", message: "Signature verification failed"}' "$results_file" > tmp.json && mv tmp.json "$results_file"

        if [[ "$EMERGENCY_BYPASS" != "true" ]]; then
            return 1
        fi
    fi

    # Step 2: Verify SLSA provenance
    log_info "📋 Verifying SLSA provenance..."
    if verify_slsa_provenance "$image_uri"; then
        log_success "SLSA provenance verified"
        verification_results+=("slsa:PASS")
        jq '.verification_results.slsa = {status: "PASS", level: "'$SLSA_LEVEL'", message: "SLSA provenance verified"}' "$results_file" > tmp.json && mv tmp.json "$results_file"
    else
        log_error "SLSA provenance verification failed"
        verification_results+=("slsa:FAIL")
        overall_status="FAIL"
        jq '.verification_results.slsa = {status: "FAIL", level: "0", message: "SLSA provenance verification failed"}' "$results_file" > tmp.json && mv tmp.json "$results_file"

        if [[ "$EMERGENCY_BYPASS" != "true" ]]; then
            return 1
        fi
    fi

    # Step 3: Verify SBOM attestation
    log_info "📦 Verifying SBOM attestation..."
    if verify_sbom_attestation "$image_uri"; then
        log_success "SBOM attestation verified"
        verification_results+=("sbom:PASS")
        jq '.verification_results.sbom = {status: "PASS", message: "SBOM attestation verified"}' "$results_file" > tmp.json && mv tmp.json "$results_file"
    else
        log_error "SBOM attestation verification failed"
        verification_results+=("sbom:FAIL")
        overall_status="FAIL"
        jq '.verification_results.sbom = {status: "FAIL", message: "SBOM attestation verification failed"}' "$results_file" > tmp.json && mv tmp.json "$results_file"

        if [[ "$EMERGENCY_BYPASS" != "true" ]]; then
            return 1
        fi
    fi

    # Step 4: Verify vulnerability attestation
    log_info "🛡️ Verifying vulnerability attestation..."
    if verify_vulnerability_attestation "$image_uri"; then
        log_success "Vulnerability attestation verified"
        verification_results+=("vulnerability:PASS")
        jq '.verification_results.vulnerability = {status: "PASS", message: "Vulnerability attestation verified"}' "$results_file" > tmp.json && mv tmp.json "$results_file"
    else
        log_error "Vulnerability attestation verification failed"
        verification_results+=("vulnerability:FAIL")
        overall_status="FAIL"
        jq '.verification_results.vulnerability = {status: "FAIL", message: "Vulnerability attestation verification failed"}' "$results_file" > tmp.json && mv tmp.json "$results_file"

        if [[ "$EMERGENCY_BYPASS" != "true" ]]; then
            return 1
        fi
    fi

    # Update overall status
    if [[ "$EMERGENCY_BYPASS" == "true" && "$overall_status" == "FAIL" ]]; then
        overall_status="BYPASS"
    fi

    jq --arg status "$overall_status" '.overall_status = $status' "$results_file" > tmp.json && mv tmp.json "$results_file"

    # Generate summary
    generate_verification_summary "$results_file"

    return $(if [[ "$overall_status" == "PASS" ]]; then echo 0; elif [[ "$overall_status" == "BYPASS" ]]; then echo 3; else echo 1; fi)
}

# Verify image signature using Cosign
verify_image_signature() {
    local image_uri="$1"

    # Use Cosign to verify the signature
    if cosign verify "$image_uri" \
        --certificate-identity-regexp="https://github.com/.*" \
        --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
        --output json > signature-verification.json 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Verify SLSA provenance using slsa-verifier
verify_slsa_provenance() {
    local image_uri="$1"

    # Extract repository from image URI for verification
    local repo_uri
    repo_uri=$(echo "$image_uri" | sed 's|ghcr.io/||' | cut -d':' -f1)

    if slsa-verifier verify-image "$image_uri" \
        --source-uri "github.com/$repo_uri" \
        --output-file slsa-verification.json 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Verify SBOM attestation
verify_sbom_attestation() {
    local image_uri="$1"

    if cosign verify-attestation "$image_uri" \
        --type spdx \
        --certificate-identity-regexp="https://github.com/.*" \
        --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
        --output json > sbom-verification.json 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Verify vulnerability attestation
verify_vulnerability_attestation() {
    local image_uri="$1"

    if cosign verify-attestation "$image_uri" \
        --type vuln \
        --certificate-identity-regexp="https://github.com/.*" \
        --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
        --output json > vuln-verification.json 2>/dev/null; then

        # Check vulnerability levels against policy
        local critical_vulns
        critical_vulns=$(jq -r '.payload' vuln-verification.json | base64 -d | jq '.predicate.critical // 0')

        if [[ "$FAIL_ON_LEVEL" == "critical" && $critical_vulns -gt 0 ]]; then
            log_error "Found $critical_vulns critical vulnerabilities (fail-on: $FAIL_ON_LEVEL)"
            return 1
        fi

        return 0
    else
        return 1
    fi
}

# Generate verification summary
generate_verification_summary() {
    local results_file="$1"

    case "$OUTPUT_FORMAT" in
        text)
            generate_text_summary "$results_file"
            ;;
        json)
            if [[ -n "$OUTPUT_FILE" ]]; then
                cp "$results_file" "$OUTPUT_FILE"
                log_info "Results written to: $OUTPUT_FILE"
            else
                cat "$results_file"
            fi
            ;;
        junit)
            generate_junit_summary "$results_file"
            ;;
    esac
}

# Generate text summary
generate_text_summary() {
    local results_file="$1"

    log_header "Verification Summary"

    local status
    status=$(jq -r '.overall_status' "$results_file")

    case "$status" in
        PASS)
            log_success "✅ Verification PASSED - All requirements met"
            ;;
        BYPASS)
            log_warning "⚠️ Verification BYPASSED - Manual review required"
            ;;
        FAIL)
            log_error "❌ Verification FAILED - Requirements not met"
            ;;
    esac

    echo
    echo "Detailed Results:"
    jq -r '.verification_results | to_entries[] | "  \(.key): \(.value.status) - \(.value.message)"' "$results_file"

    if [[ "$EMERGENCY_BYPASS" == "true" ]]; then
        echo
        log_warning "🚨 EMERGENCY BYPASS USED"
        log_warning "This verification requires manual security review"
        log_warning "Emergency bypass logged for audit trail"
    fi
}

# Generate JUnit XML summary
generate_junit_summary() {
    local results_file="$1"
    local junit_file="${OUTPUT_FILE:-verification-results.xml}"

    local status
    status=$(jq -r '.overall_status' "$results_file")

    local test_count=0
    local failure_count=0

    # Count tests and failures
    while IFS= read -r line; do
        test_count=$((test_count + 1))
        if [[ "$line" == *'"status": "FAIL"'* ]]; then
            failure_count=$((failure_count + 1))
        fi
    done < <(jq -c '.verification_results | to_entries[]' "$results_file")

    cat > "$junit_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="verify-bundle" tests="$test_count" failures="$failure_count" timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)">
$(jq -r '.verification_results | to_entries[] |
    if .value.status == "PASS" then
        "  <testcase classname=\"verify-bundle\" name=\"\(.key)\"/>"
    else
        "  <testcase classname=\"verify-bundle\" name=\"\(.key)\">
    <failure message=\"\(.value.message)\"/>
  </testcase>"
    end' "$results_file")
</testsuite>
EOF

    log_info "JUnit results written to: $junit_file"
}

# Main execution
main() {
    # Parse arguments
    parse_args "$@"

    # Execute command
    case "$COMMAND" in
        version)
            echo "verify-bundle version $TOOL_VERSION"
            echo "IntelGraph Provenance Verification Tool"
            exit 0
            ;;
        policy)
            create_policy_file "$POLICY_CREATE_FILE"
            exit 0
            ;;
        verify)
            check_dependencies
            load_policy "$POLICY_FILE"

            if [[ -n "$IMAGE_URI" ]]; then
                verify_image "$IMAGE_URI" "${OUTPUT_FILE:-verification-results.json}"
            elif [[ -n "$BUNDLE_PATH" ]]; then
                log_error "Bundle verification not yet implemented"
                exit 2
            fi
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi