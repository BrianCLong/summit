#!/usr/bin/env bash
set -euo pipefail

# Conductor Drift Detection Script
# Detects configuration drift in environment and infrastructure

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Global Drift Flag
DRIFT_FOUND=0

say() { printf "\n${BLUE}== %s ==${NC}\n" "$*"; }
pass() { printf "${GREEN}✅ %s${NC}\n" "$*"; }
fail() { printf "${RED}❌ %s${NC}\n" "$*"; DRIFT_FOUND=1; }
warn() { printf "${YELLOW}⚠️  %s${NC}\n" "$*"; DRIFT_FOUND=1; }

# Check environment drift
check_env_drift() {
    say "Checking Environment Variable Drift"
    
    local current_env=$(mktemp)
    local baseline_env=".env.baseline"
    
    # Export current environment (filtered)
    printenv | grep -E '^(CONDUCTOR_|OPA_|MCP_|NEO4J_|POSTGRES_|REDIS_|LLM_)' | sort > "$current_env"
    
    if [ ! -f "$baseline_env" ]; then
        cp "$current_env" "$baseline_env"
        warn "Created baseline environment file: $baseline_env"
        rm -f "$current_env"
        return 0
    fi
    
    # Compare environments
    local added=$(comm -13 "$baseline_env" "$current_env")
    local removed=$(comm -23 "$baseline_env" "$current_env")
    local changed=$(comm -12 "$baseline_env" "$current_env" | while read line; do
        key=$(echo "$line" | cut -d= -f1)
        if [ "$(grep "^$key=" "$baseline_env")" != "$(grep "^$key=" "$current_env")" ]; then
            echo "$line"
        fi
    done)
    
    # Report drift
    if [ -n "$added" ]; then
        warn "Added environment variables:"
        echo "$added" | sed 's/^/  + /'
    fi
    
    if [ -n "$removed" ]; then
        warn "Removed environment variables:"
        echo "$removed" | sed 's/^/  - /'
    fi
    
    if [ -n "$changed" ]; then
        warn "Changed environment variables:"
        echo "$changed" | sed 's/^/  * /'
    fi
    
    if [ -z "$added" ] && [ -z "$removed" ] && [ -z "$changed" ]; then
        pass "No environment drift detected"
    fi
    
    rm -f "$current_env"
}

# Check image digest drift
check_image_drift() {
    say "Checking Container Image Drift"
    
    local current_images=$(mktemp)
    local baseline_images="image-digests.baseline"
    
    # Get current image digests
    {
        echo "# Container Image Digests - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        if command -v docker >/dev/null 2>&1; then
             docker compose images --quiet 2>/dev/null | while read image; do
                if [ -n "$image" ]; then
                    echo -n "$image "
                    if command -v skopeo >/dev/null 2>&1; then
                        skopeo inspect "docker://$image" 2>/dev/null | jq -r '.Digest // "unknown"' || echo "unknown"
                    else
                        docker inspect "$image" --format='{{.RepoDigests}}' 2>/dev/null | grep -o 'sha256:[a-f0-9]*' | head -1 || echo "unknown"
                    fi
                fi
            done || true
        fi
    } > "$current_images"
    
    if [ ! -f "$baseline_images" ]; then
        cp "$current_images" "$baseline_images"
        warn "Created baseline image digests file: $baseline_images"
        rm -f "$current_images"
        return 0
    fi
    
    # Compare image digests
    local drift_detected=false
    while read -r line; do
        if [[ "$line" =~ ^#.* ]] || [ -z "$line" ]; then
            continue
        fi
        
        local image=$(echo "$line" | awk '{print $1}')
        local current_digest=$(echo "$line" | awk '{print $2}')
        local baseline_digest=$(grep "^$image " "$baseline_images" 2>/dev/null | awk '{print $2}' || echo "")
        
        if [ -n "$baseline_digest" ] && [ "$current_digest" != "$baseline_digest" ]; then
            warn "Image digest changed: $image"
            echo "  Baseline: $baseline_digest"
            echo "  Current:  $current_digest"
            drift_detected=true
        elif [ -z "$baseline_digest" ]; then
            warn "New image detected: $image ($current_digest)"
            drift_detected=true
        fi
    done < "$current_images"
    
    # Check for removed images
    while read -r line; do
        if [[ "$line" =~ ^#.* ]] || [ -z "$line" ]; then
            continue
        fi
        
        local image=$(echo "$line" | awk '{print $1}')
        if ! grep -q "^$image " "$current_images"; then
            warn "Image removed: $image"
            drift_detected=true
        fi
    done < "$baseline_images"
    
    if [ "$drift_detected" = false ]; then
        pass "No image drift detected"
    fi
    
    rm -f "$current_images"
}

# Check configuration file drift
check_config_drift() {
    say "Checking Configuration File Drift"
    
    local config_files=(
        "docker-compose.dev.yml"
        "Justfile"
        "policy/opa-config.yaml"
        "observability/prometheus.yml"
        "observability/alert-rules.yml"
    )
    
    local config_hashes=$(mktemp)
    local baseline_hashes="config-hashes.baseline"
    
    # Generate current config hashes
    {
        echo "# Configuration File Hashes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        for config in "${config_files[@]}"; do
            if [ -f "$config" ]; then
                echo -n "$config "
                sha256sum "$config" | cut -d' ' -f1
            fi
        done
    } > "$config_hashes"
    
    if [ ! -f "$baseline_hashes" ]; then
        cp "$config_hashes" "$baseline_hashes"
        warn "Created baseline config hashes: $baseline_hashes"
        rm -f "$config_hashes"
        return 0
    fi
    
    # Compare configuration hashes
    local drift_detected=false
    while read -r line; do
        if [[ "$line" =~ ^#.* ]] || [ -z "$line" ]; then
            continue
        fi
        
        local config=$(echo "$line" | awk '{print $1}')
        local current_hash=$(echo "$line" | awk '{print $2}')
        local baseline_hash=$(grep "^$config " "$baseline_hashes" 2>/dev/null | awk '{print $2}' || echo "")
        
        if [ -n "$baseline_hash" ] && [ "$current_hash" != "$baseline_hash" ]; then
            warn "Configuration changed: $config"
            echo "  Baseline: $baseline_hash"
            echo "  Current:  $current_hash"
            drift_detected=true
        elif [ -z "$baseline_hash" ]; then
            warn "New configuration: $config ($current_hash)"
            drift_detected=true
        fi
    done < "$config_hashes"
    
    if [ "$drift_detected" = false ]; then
        pass "No configuration drift detected"
    fi
    
    rm -f "$config_hashes"
}

# Check Workflow Integrity
check_workflow_integrity() {
    say "Checking Critical Workflow Integrity"

    # List of critical workflows to monitor
    local workflows=(
        ".github/workflows/ga-gate.yml"
        ".github/workflows/ci.yml"
        ".github/workflows/release-ga.yml"
        ".github/workflows/governance-drift-check.yml"
        ".github/workflows/ga-drift-monitor.yml"
    )

    local workflow_hashes=$(mktemp)
    local baseline_workflows="workflow-hashes.baseline"

    # Generate current hashes
    {
        echo "# Workflow Hashes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        for wf in "${workflows[@]}"; do
            if [ -f "$wf" ]; then
                echo -n "$wf "
                sha256sum "$wf" | cut -d' ' -f1
            fi
        done
    } > "$workflow_hashes"

    if [ ! -f "$baseline_workflows" ]; then
        cp "$workflow_hashes" "$baseline_workflows"
        warn "Created baseline workflow hashes: $baseline_workflows"
        rm -f "$workflow_hashes"
        return 0
    fi

    # Compare hashes
    local drift_detected=false
    while read -r line; do
        if [[ "$line" =~ ^#.* ]] || [ -z "$line" ]; then
            continue
        fi

        local wf=$(echo "$line" | awk '{print $1}')
        local current_hash=$(echo "$line" | awk '{print $2}')
        local baseline_hash=$(grep "^$wf " "$baseline_workflows" 2>/dev/null | awk '{print $2}' || echo "")

        if [ -n "$baseline_hash" ] && [ "$current_hash" != "$baseline_hash" ]; then
            fail "Workflow modified: $wf"
            echo "  Baseline: $baseline_hash"
            echo "  Current:  $current_hash"
            drift_detected=true
        elif [ -z "$baseline_hash" ]; then
             # New workflow implies drift if not in baseline, but we only check strictly defined list
             :
        fi
    done < "$workflow_hashes"

    if [ "$drift_detected" = false ]; then
        pass "Critical workflows integrity verified"
    fi

    rm -f "$workflow_hashes"
}

# Check Script Integrity
check_script_integrity() {
    say "Checking Critical Script Integrity"

    local scripts=(
        "scripts/drift-check.sh"
        "scripts/verify-ga.sh"
        "scripts/verify-evidence-bundle.ts"
        "scripts/release/check_governance_drift.sh"
    )

    local script_hashes=$(mktemp)
    local baseline_scripts="script-hashes.baseline"

    {
        echo "# Script Hashes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        for s in "${scripts[@]}"; do
            if [ -f "$s" ]; then
                echo -n "$s "
                sha256sum "$s" | cut -d' ' -f1
            fi
        done
    } > "$script_hashes"

    if [ ! -f "$baseline_scripts" ]; then
        cp "$script_hashes" "$baseline_scripts"
        warn "Created baseline script hashes: $baseline_scripts"
        rm -f "$script_hashes"
        return 0
    fi

    # Compare
    local drift_detected=false
    while read -r line; do
        if [[ "$line" =~ ^#.* ]] || [ -z "$line" ]; then
             continue
        fi

        local s=$(echo "$line" | awk '{print $1}')
        local current_hash=$(echo "$line" | awk '{print $2}')
        local baseline_hash=$(grep "^$s " "$baseline_scripts" 2>/dev/null | awk '{print $2}' || echo "")

        if [ -n "$baseline_hash" ] && [ "$current_hash" != "$baseline_hash" ]; then
            fail "Critical script modified: $s"
            echo "  Baseline: $baseline_hash"
            echo "  Current:  $current_hash"
            drift_detected=true
        fi
    done < "$script_hashes"

    if [ "$drift_detected" = false ]; then
        pass "Critical scripts integrity verified"
    fi
    rm -f "$script_hashes"
}

# Check service status drift
check_service_drift() {
    say "Checking Service Status"
    
    if [ -f "docker-compose.dev.yml" ] && command -v docker >/dev/null 2>&1; then
        local services_down=()
        
        # Check each service status
        while read -r service; do
            if ! docker compose ps "$service" 2>/dev/null | grep -q "Up"; then
                services_down+=("$service")
            fi
        done < <(docker compose config --services 2>/dev/null || echo "")
        
        if [ ${#services_down[@]} -gt 0 ]; then
            warn "Services not running:"
            for service in "${services_down[@]}"; do
                echo "  - $service"
            done
        else
            pass "All services are running"
        fi
    fi
}

# Check policy bundle drift
check_policy_drift() {
    say "Checking Policy Bundle Drift"
    
    if [ -d "policy/bundles" ]; then
        local bundle_hashes=$(mktemp)
        local baseline_bundles="policy-bundles.baseline"
        
        # Generate bundle hashes
        {
            echo "# Policy Bundle Hashes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
            find policy/bundles -name "*.tar.gz" -exec sha256sum {} \; | sed 's|policy/bundles/||'
        } > "$bundle_hashes"
        
        if [ ! -f "$baseline_bundles" ]; then
            cp "$bundle_hashes" "$baseline_bundles"
            warn "Created baseline policy bundles: $baseline_bundles"
            rm -f "$bundle_hashes"
            return 0
        fi
        
        # Compare bundle hashes
        if ! diff -q "$baseline_bundles" "$bundle_hashes" >/dev/null; then
            warn "Policy bundle changes detected"
            diff "$baseline_bundles" "$bundle_hashes" | grep '^[<>]' | sed 's/^</  Baseline: /' | sed 's/^>/  Current:  /'
        else
            pass "Policy bundles unchanged"
        fi
        
        rm -f "$bundle_hashes"
    else
        # warn "Policy bundles directory not found"
        :
    fi
}

# Generate drift report
generate_drift_report() {
    local report_file="drift-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Conductor Drift Detection Report

Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Host: $(hostname)
User: ${USER:-unknown}

## Summary

This report identifies configuration and infrastructure drift in the Conductor system.

## Baseline Files

- \`image-digests.baseline\`: Container image digest baseline
- \`config-hashes.baseline\`: Configuration file hash baseline  
- \`policy-bundles.baseline\`: Policy bundle hash baseline
- \`.env.baseline\`: Environment variable baseline
- \`workflow-hashes.baseline\`: CI Workflow integrity baseline
- \`script-hashes.baseline\`: Critical script integrity baseline

## Recommendations

1. **Review all detected drift** - Ensure changes are intentional
2. **Update baselines** if changes are approved: \`./scripts/drift-check.sh --update-baselines\`
3. **Investigate unexpected changes** - May indicate security issues
4. **Automate drift detection** - Run in CI/CD pipelines

## Monitoring

Consider setting up automated drift detection:

\`\`\`bash
# Daily cron job
0 2 * * * /path/to/drift-check.sh --fail-on-drift
\`\`\`

EOF
    
    echo "📄 Drift report generated: $report_file"
}

# Update baseline files
update_baselines() {
    say "Updating baseline files"
    
    # Update environment baseline
    printenv | grep -E '^(CONDUCTOR_|OPA_|MCP_|NEO4J_|POSTGRES_|REDIS_|LLM_)' | sort > ".env.baseline"
    pass "Updated .env.baseline"
    
    # Update image digest baseline
    {
        echo "# Container Image Digests - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        if command -v docker >/dev/null 2>&1; then
             docker compose images --quiet 2>/dev/null | while read image; do
                if [ -n "$image" ]; then
                    echo -n "$image "
                    if command -v skopeo >/dev/null 2>&1; then
                        skopeo inspect "docker://$image" 2>/dev/null | jq -r '.Digest // "unknown"' || echo "unknown"
                    else
                        docker inspect "$image" --format='{{.RepoDigests}}' 2>/dev/null | grep -o 'sha256:[a-f0-9]*' | head -1 || echo "unknown"
                    fi
                fi
            done || true
        fi
    } > "image-digests.baseline"
    pass "Updated image-digests.baseline"
    
    # Update config baseline
    local config_files=("docker-compose.dev.yml" "Justfile" "policy/opa-config.yaml" "observability/prometheus.yml" "observability/alert-rules.yml")
    {
        echo "# Configuration File Hashes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        for config in "${config_files[@]}"; do
            if [ -f "$config" ]; then
                echo -n "$config "
                sha256sum "$config" | cut -d' ' -f1
            fi
        done
    } > "config-hashes.baseline"
    pass "Updated config-hashes.baseline"
    
    # Update policy baseline
    if [ -d "policy/bundles" ]; then
        {
            echo "# Policy Bundle Hashes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
            find policy/bundles -name "*.tar.gz" -exec sha256sum {} \; | sed 's|policy/bundles/||'
        } > "policy-bundles.baseline"
        pass "Updated policy-bundles.baseline"
    fi

    # Update workflow baseline
    local workflows=(
        ".github/workflows/ga-gate.yml"
        ".github/workflows/ci.yml"
        ".github/workflows/release-ga.yml"
        ".github/workflows/governance-drift-check.yml"
        ".github/workflows/ga-drift-monitor.yml"
    )
    {
        echo "# Workflow Hashes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        for wf in "${workflows[@]}"; do
            if [ -f "$wf" ]; then
                echo -n "$wf "
                sha256sum "$wf" | cut -d' ' -f1
            fi
        done
    } > "workflow-hashes.baseline"
    pass "Updated workflow-hashes.baseline"

    # Update script baseline
    local scripts=(
        "scripts/drift-check.sh"
        "scripts/verify-ga.sh"
        "scripts/verify-evidence-bundle.ts"
        "scripts/release/check_governance_drift.sh"
    )
    {
        echo "# Script Hashes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        for s in "${scripts[@]}"; do
            if [ -f "$s" ]; then
                echo -n "$s "
                sha256sum "$s" | cut -d' ' -f1
            fi
        done
    } > "script-hashes.baseline"
    pass "Updated script-hashes.baseline"
}

# Main execution
main() {
    local fail_on_drift=0

    if [ "${1:-}" == "--fail-on-drift" ]; then
        fail_on_drift=1
    fi

    say "🔍 Conductor Drift Detection"
    
    check_env_drift
    check_image_drift
    check_config_drift
    check_workflow_integrity
    check_script_integrity
    check_service_drift
    check_policy_drift
    
    generate_drift_report
    
    say "Drift detection completed"

    if [ "$DRIFT_FOUND" -eq 1 ]; then
        echo ""
        warn "Drift Detected!"
        if [ "$fail_on_drift" -eq 1 ]; then
             echo "Failure enforced by --fail-on-drift"
             exit 1
        fi
    else
        pass "System is compliant with baselines."
    fi

    echo ""
    echo "📋 Next Steps:"
    echo "1. Review detected drift"
    echo "2. Update baselines if changes are approved: ./scripts/drift-check.sh --update-baselines"
    echo "3. Investigate unexpected changes"
}

# Handle arguments
case "${1:-}" in
    --update-baselines)
        update_baselines
        ;;
    --help)
        cat << EOF
Usage: $0 [options]

Conductor Drift Detection Script

Options:
  --update-baselines    Update all baseline files with current state
  --fail-on-drift       Exit with error code 1 if drift is detected
  --help                Show this help

Files:
  .env.baseline              Environment variable baseline
  image-digests.baseline     Container image digest baseline
  config-hashes.baseline     Configuration file hash baseline
  policy-bundles.baseline    Policy bundle hash baseline
  workflow-hashes.baseline   Critical workflow hashes
  script-hashes.baseline     Critical script hashes

Examples:
  # Check for drift
  ./scripts/drift-check.sh
  
  # Check for drift and fail if found (CI/CD)
  ./scripts/drift-check.sh --fail-on-drift

  # Update baselines after approved changes
  ./scripts/drift-check.sh --update-baselines

EOF
        ;;
    *)
        main "${1:-}"
        ;;
esac
