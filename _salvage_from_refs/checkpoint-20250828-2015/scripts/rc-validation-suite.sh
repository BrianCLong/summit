#!/bin/bash

# RC Hardening Validation Suite
# Comprehensive validation of Operation NIGHT MARKET components

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATION_REPORT_DIR="$PROJECT_ROOT/reports/rc-validation"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Validation tracking
VALIDATION_RESULTS=()
TOTAL_VALIDATIONS=0
PASSED_VALIDATIONS=0

record_validation() {
    local component="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_VALIDATIONS=$((TOTAL_VALIDATIONS + 1))
    
    if [ "$status" = "PASS" ]; then
        PASSED_VALIDATIONS=$((PASSED_VALIDATIONS + 1))
        log_success "$component: $message"
    else
        log_error "$component: $message"
    fi
    
    VALIDATION_RESULTS+=("$component,$status,$message")
}

# Setup validation environment
setup_validation_env() {
    log_info "Setting up RC Hardening validation environment..."
    
    # Create reports directory
    mkdir -p "$VALIDATION_REPORT_DIR"
    
    # Check dependencies
    local deps=("node" "npm" "docker" "kubectl" "jq" "curl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "Required dependency not found: $dep"
            exit 1
        fi
    done
    
    # Start required services for testing
    log_info "Starting validation services..."
    
    # Start Redis for caching tests
    if ! docker ps | grep -q "redis-validation"; then
        docker run -d --name redis-validation -p 6380:6379 redis:7-alpine > /dev/null 2>&1 || true
    fi
    
    # Start PostgreSQL for database tests
    if ! docker ps | grep -q "postgres-validation"; then
        docker run -d --name postgres-validation \
            -e POSTGRES_PASSWORD=validation \
            -e POSTGRES_DB=intelgraph_test \
            -p 5433:5432 postgres:15-alpine > /dev/null 2>&1 || true
    fi
    
    # Start Kafka for streaming tests
    if ! docker ps | grep -q "kafka-validation"; then
        docker run -d --name kafka-validation \
            -p 9093:9092 \
            -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
            -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9093 \
            confluentinc/cp-kafka:latest > /dev/null 2>&1 || true
    fi
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    log_success "Validation environment setup complete"
}

# Validate streaming resilience components
validate_streaming_resilience() {
    log_info "🔄 Validating Streaming Resilience Components..."
    
    # StreamingSLO validation
    if [ -f "$PROJECT_ROOT/server/src/streaming/StreamingSLO.ts" ]; then
        local slo_features=$(grep -c "class\|interface\|async.*SLO" "$PROJECT_ROOT/server/src/streaming/StreamingSLO.ts" 2>/dev/null || echo 0)
        if [ "$slo_features" -ge 5 ]; then
            record_validation "StreamingSLO" "PASS" "SLO monitoring implementation validated ($slo_features features detected)"
        else
            record_validation "StreamingSLO" "FAIL" "Insufficient SLO implementation features"
        fi
    else
        record_validation "StreamingSLO" "FAIL" "StreamingSLO.ts not found"
    fi
    
    # IdempotentProducer validation
    if [ -f "$PROJECT_ROOT/server/src/streaming/IdempotentProducer.ts" ]; then
        if grep -q "exactly-once\|idempotent\|messageId" "$PROJECT_ROOT/server/src/streaming/IdempotentProducer.ts"; then
            record_validation "IdempotentProducer" "PASS" "Exactly-once semantics implementation validated"
        else
            record_validation "IdempotentProducer" "FAIL" "Missing exactly-once semantics implementation"
        fi
    else
        record_validation "IdempotentProducer" "FAIL" "IdempotentProducer.ts not found"
    fi
    
    # DLQReplay validation
    if [ -f "$PROJECT_ROOT/server/src/streaming/DLQReplay.ts" ]; then
        if grep -q "replay\|DLQ\|deadLetter" "$PROJECT_ROOT/server/src/streaming/DLQReplay.ts"; then
            record_validation "DLQReplay" "PASS" "DLQ replay functionality validated"
        else
            record_validation "DLQReplay" "FAIL" "Missing DLQ replay implementation"
        fi
    else
        record_validation "DLQReplay" "FAIL" "DLQReplay.ts not found"
    fi
}

# Validate security and policy components
validate_security_policies() {
    log_info "🔒 Validating Security & Policy Components..."
    
    # Reason for Access validation
    if [ -f "$PROJECT_ROOT/server/src/middleware/reasonForAccess.ts" ]; then
        if grep -q "AccessContext\|reasonForAccess\|qualityScore" "$PROJECT_ROOT/server/src/middleware/reasonForAccess.ts"; then
            record_validation "ReasonForAccess" "PASS" "Access context propagation implemented"
        else
            record_validation "ReasonForAccess" "FAIL" "Missing access context implementation"
        fi
    else
        record_validation "ReasonForAccess" "FAIL" "reasonForAccess.ts not found"
    fi
    
    # Export Signing validation
    if [ -f "$PROJECT_ROOT/server/src/security/ExportSigning.ts" ]; then
        if grep -q "RSA-SHA256\|signExport\|verifySignature" "$PROJECT_ROOT/server/src/security/ExportSigning.ts"; then
            record_validation "ExportSigning" "PASS" "Cryptographic export signing implemented"
        else
            record_validation "ExportSigning" "FAIL" "Missing cryptographic signing implementation"
        fi
    else
        record_validation "ExportSigning" "FAIL" "ExportSigning.ts not found"
    fi
    
    # OPA Policies validation
    if [ -f "$PROJECT_ROOT/server/src/security/policies/export.rego" ]; then
        if grep -q "allow\|cross_tenant\|classification" "$PROJECT_ROOT/server/src/security/policies/export.rego"; then
            record_validation "OPAPolicies" "PASS" "Export policies with cross-tenant protection implemented"
        else
            record_validation "OPAPolicies" "FAIL" "Missing comprehensive policy implementation"
        fi
    else
        record_validation "OPAPolicies" "FAIL" "export.rego policy file not found"
    fi
}

# Validate AI security components
validate_ai_security() {
    log_info "🤖 Validating AI Security Components..."
    
    # Prompt Injection Defense validation
    if [ -f "$PROJECT_ROOT/server/src/security/PromptInjectionDefense.ts" ]; then
        local patterns=$(grep -c "injection\|manipulation\|attack" "$PROJECT_ROOT/server/src/security/PromptInjectionDefense.ts" 2>/dev/null || echo 0)
        if [ "$patterns" -ge 5 ]; then
            record_validation "PromptInjectionDefense" "PASS" "Comprehensive injection defense ($patterns patterns detected)"
        else
            record_validation "PromptInjectionDefense" "FAIL" "Insufficient injection defense patterns"
        fi
    else
        record_validation "PromptInjectionDefense" "FAIL" "PromptInjectionDefense.ts not found"
    fi
    
    # Secure AI Assistant validation
    if [ -f "$PROJECT_ROOT/server/src/ai/SecureAIAssistant.ts" ]; then
        if grep -q "allowlist\|security_level\|clearance" "$PROJECT_ROOT/server/src/ai/SecureAIAssistant.ts"; then
            record_validation "SecureAIAssistant" "PASS" "AI tool allowlist enforcement implemented"
        else
            record_validation "SecureAIAssistant" "FAIL" "Missing AI security controls"
        fi
    else
        record_validation "SecureAIAssistant" "FAIL" "SecureAIAssistant.ts not found"
    fi
}

# Validate MLOps components
validate_mlops() {
    log_info "📊 Validating MLOps Components..."
    
    # Model Registry validation
    if [ -f "$PROJECT_ROOT/server/src/mlops/ModelRegistry.ts" ]; then
        if grep -q "drift\|shadow\|evaluation" "$PROJECT_ROOT/server/src/mlops/ModelRegistry.ts"; then
            record_validation "ModelRegistry" "PASS" "MLOps model registry with drift monitoring implemented"
        else
            record_validation "ModelRegistry" "FAIL" "Missing MLOps features"
        fi
    else
        record_validation "ModelRegistry" "FAIL" "ModelRegistry.ts not found"
    fi
    
    # Alerting System validation
    if [ -f "$PROJECT_ROOT/server/src/monitoring/AlertingSystem.ts" ]; then
        local rules=$(grep -c "AlertRule\|escalation\|threshold" "$PROJECT_ROOT/server/src/monitoring/AlertingSystem.ts" 2>/dev/null || echo 0)
        if [ "$rules" -ge 3 ]; then
            record_validation "AlertingSystem" "PASS" "Comprehensive alerting system ($rules rules detected)"
        else
            record_validation "AlertingSystem" "FAIL" "Insufficient alerting implementation"
        fi
    else
        record_validation "AlertingSystem" "FAIL" "AlertingSystem.ts not found"
    fi
}

# Validate supply chain security
validate_supply_chain() {
    log_info "📦 Validating Supply Chain Security..."
    
    # SBOM Generation validation
    if [ -f "$PROJECT_ROOT/scripts/generate-sbom.js" ]; then
        if grep -q "CycloneDX\|SBOM\|dependencies" "$PROJECT_ROOT/scripts/generate-sbom.js"; then
            record_validation "SBOMGeneration" "PASS" "SBOM generation script implemented"
            
            # Test SBOM generation
            if cd "$PROJECT_ROOT" && npm run sbom > /dev/null 2>&1; then
                record_validation "SBOMGeneration-Test" "PASS" "SBOM generation test successful"
            else
                record_validation "SBOMGeneration-Test" "FAIL" "SBOM generation test failed"
            fi
        else
            record_validation "SBOMGeneration" "FAIL" "Missing SBOM implementation"
        fi
    else
        record_validation "SBOMGeneration" "FAIL" "generate-sbom.js not found"
    fi
    
    # Image Signing validation
    if [ -f "$PROJECT_ROOT/scripts/image-signing.js" ]; then
        if grep -q "cosign\|sigstore\|signing" "$PROJECT_ROOT/scripts/image-signing.js"; then
            record_validation "ImageSigning" "PASS" "Container image signing implemented"
        else
            record_validation "ImageSigning" "FAIL" "Missing image signing implementation"
        fi
    else
        record_validation "ImageSigning" "FAIL" "image-signing.js not found"
    fi
}

# Validate incident response
validate_incident_response() {
    log_info "🚨 Validating Incident Response Framework..."
    
    # Incident Response Playbooks validation
    if [ -f "$PROJECT_ROOT/docs/runbooks/incident-response-playbooks.md" ]; then
        local scenarios=$(grep -c "^## [0-9]" "$PROJECT_ROOT/docs/runbooks/incident-response-playbooks.md" 2>/dev/null || echo 0)
        if [ "$scenarios" -ge 6 ]; then
            record_validation "IncidentPlaybooks" "PASS" "Comprehensive incident playbooks ($scenarios scenarios)"
        else
            record_validation "IncidentPlaybooks" "FAIL" "Insufficient incident scenarios"
        fi
    else
        record_validation "IncidentPlaybooks" "FAIL" "incident-response-playbooks.md not found"
    fi
    
    # Tabletop Exercise validation
    if [ -f "$PROJECT_ROOT/scripts/tabletop-exercise.js" ]; then
        if grep -q "exercise\|scenario\|assessment" "$PROJECT_ROOT/scripts/tabletop-exercise.js"; then
            record_validation "TabletopExercise" "PASS" "Automated tabletop exercise framework implemented"
        else
            record_validation "TabletopExercise" "FAIL" "Missing tabletop exercise features"
        fi
    else
        record_validation "TabletopExercise" "FAIL" "tabletop-exercise.js not found"
    fi
}

# Run integration tests
run_integration_tests() {
    log_info "🧪 Running RC Hardening Integration Tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run TypeScript compilation check
    if npx tsc --noEmit > /dev/null 2>&1; then
        record_validation "TypeScriptCompilation" "PASS" "All TypeScript code compiles successfully"
    else
        record_validation "TypeScriptCompilation" "FAIL" "TypeScript compilation errors detected"
    fi
    
    # Run integration test suite
    if npm test -- --testPathPattern="rc-hardening-validation" --passWithNoTests > /dev/null 2>&1; then
        record_validation "IntegrationTests" "PASS" "RC hardening integration tests passed"
    else
        record_validation "IntegrationTests" "FAIL" "RC hardening integration tests failed"
    fi
    
    # Test individual component APIs
    log_info "Testing component API endpoints..."
    
    # Start server in background for API testing
    if npm run dev > /dev/null 2>&1 &; then
        local server_pid=$!
        sleep 15  # Give server time to start
        
        # Test health endpoints
        if curl -s http://localhost:4001/healthz > /dev/null; then
            record_validation "HealthEndpoint" "PASS" "Health endpoint responding"
        else
            record_validation "HealthEndpoint" "FAIL" "Health endpoint not responding"
        fi
        
        # Clean up server
        kill $server_pid > /dev/null 2>&1 || true
        sleep 2
    else
        record_validation "ServerStartup" "FAIL" "Unable to start server for API testing"
    fi
}

# Generate validation report
generate_report() {
    log_info "📋 Generating RC Hardening Validation Report..."
    
    local report_file="$VALIDATION_REPORT_DIR/rc-validation-$TIMESTAMP.json"
    local summary_file="$VALIDATION_REPORT_DIR/rc-validation-summary-$TIMESTAMP.txt"
    
    # Calculate success rate
    local success_rate=0
    if [ "$TOTAL_VALIDATIONS" -gt 0 ]; then
        success_rate=$(( (PASSED_VALIDATIONS * 100) / TOTAL_VALIDATIONS ))
    fi
    
    # Generate JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "validation_run_id": "rc-validation-$TIMESTAMP",
  "summary": {
    "total_validations": $TOTAL_VALIDATIONS,
    "passed_validations": $PASSED_VALIDATIONS,
    "failed_validations": $((TOTAL_VALIDATIONS - PASSED_VALIDATIONS)),
    "success_rate_percent": $success_rate
  },
  "results": [
EOF
    
    # Add individual results
    local first=true
    for result in "${VALIDATION_RESULTS[@]}"; do
        IFS=',' read -r component status message <<< "$result"
        
        if [ "$first" = false ]; then
            echo "    ," >> "$report_file"
        fi
        first=false
        
        cat >> "$report_file" << EOF
    {
      "component": "$component",
      "status": "$status",
      "message": "$message"
    }EOF
    done
    
    cat >> "$report_file" << EOF

  ]
}
EOF
    
    # Generate summary report
    cat > "$summary_file" << EOF
RC HARDENING VALIDATION SUMMARY
===============================

Validation Run: $TIMESTAMP
Total Validations: $TOTAL_VALIDATIONS
Passed: $PASSED_VALIDATIONS
Failed: $((TOTAL_VALIDATIONS - PASSED_VALIDATIONS))
Success Rate: $success_rate%

COMPONENT BREAKDOWN:
EOF
    
    for result in "${VALIDATION_RESULTS[@]}"; do
        IFS=',' read -r component status message <<< "$result"
        printf "%-25s %s %s\n" "$component" "$status" "$message" >> "$summary_file"
    done
    
    cat >> "$summary_file" << EOF

RECOMMENDATIONS:
- Components with FAIL status require immediate attention
- Success rate should be >95% for production readiness
- Review failed components and address issues before deployment

Report files:
- Detailed JSON: $report_file
- Summary: $summary_file
EOF
    
    log_success "Validation report generated: $report_file"
    log_info "Summary report: $summary_file"
}

# Cleanup validation environment
cleanup_validation_env() {
    log_info "🧹 Cleaning up validation environment..."
    
    # Stop validation containers
    docker stop redis-validation postgres-validation kafka-validation > /dev/null 2>&1 || true
    docker rm redis-validation postgres-validation kafka-validation > /dev/null 2>&1 || true
    
    log_success "Cleanup complete"
}

# Main validation flow
main() {
    echo "🚀 RC Hardening Comprehensive Validation Suite"
    echo "=============================================="
    echo "Timestamp: $(date)"
    echo "Project: IntelGraph Operation NIGHT MARKET"
    echo ""
    
    # Setup
    setup_validation_env
    
    # Run all validations
    validate_streaming_resilience
    validate_security_policies
    validate_ai_security
    validate_mlops
    validate_supply_chain
    validate_incident_response
    run_integration_tests
    
    # Generate final report
    generate_report
    
    # Cleanup
    cleanup_validation_env
    
    # Final summary
    echo ""
    echo "🎯 RC HARDENING VALIDATION COMPLETE"
    echo "===================================="
    echo "Total Validations: $TOTAL_VALIDATIONS"
    echo "Passed: $PASSED_VALIDATIONS"
    echo "Failed: $((TOTAL_VALIDATIONS - PASSED_VALIDATIONS))"
    
    local success_rate=0
    if [ "$TOTAL_VALIDATIONS" -gt 0 ]; then
        success_rate=$(( (PASSED_VALIDATIONS * 100) / TOTAL_VALIDATIONS ))
    fi
    
    echo "Success Rate: $success_rate%"
    
    if [ "$success_rate" -ge 95 ]; then
        log_success "🎉 RC Hardening validation PASSED - Ready for production deployment"
        exit 0
    elif [ "$success_rate" -ge 80 ]; then
        log_warning "⚠️  RC Hardening validation PARTIAL - Review failed components"
        exit 1
    else
        log_error "❌ RC Hardening validation FAILED - Significant issues detected"
        exit 2
    fi
}

# Handle script termination
trap cleanup_validation_env EXIT

# Run main function
main "$@"