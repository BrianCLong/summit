#!/bin/bash

# Docker Security Audit Script for IntelGraph
# Comprehensive security assessment of Docker configurations and containers

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AUDIT_LOG="${PROJECT_ROOT}/logs/docker-security-audit.log"
REPORT_FILE="${PROJECT_ROOT}/reports/docker-security-report.html"

# Create necessary directories
mkdir -p "$(dirname "$AUDIT_LOG")" "$(dirname "$REPORT_FILE")"

# Logging function
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$AUDIT_LOG"
}

# Print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
    log "INFO" "$message"
}

# Initialize audit
init_audit() {
    print_status "$BLUE" "🔒 Starting Docker Security Audit for IntelGraph"
    print_status "$CYAN" "📁 Project Root: $PROJECT_ROOT"
    print_status "$CYAN" "📋 Audit Log: $AUDIT_LOG"
    print_status "$CYAN" "📊 Report File: $REPORT_FILE"
    echo
    
    # Clear previous logs
    > "$AUDIT_LOG"
    
    # Start HTML report
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IntelGraph Docker Security Audit Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .pass { background-color: #d4edda; border-left: 4px solid #28a745; }
        .fail { background-color: #f8d7da; border-left: 4px solid #dc3545; }
        .warn { background-color: #fff3cd; border-left: 4px solid #ffc107; }
        .info { background-color: #d1ecf1; border-left: 4px solid #17a2b8; }
        .code { background-color: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; }
        .summary { display: flex; justify-content: space-around; margin: 20px 0; }
        .metric { text-align: center; padding: 20px; background: #ecf0f1; border-radius: 8px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .timestamp { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 IntelGraph Docker Security Audit Report</h1>
        <div class="timestamp">Generated on: $(date)</div>
        <div class="summary">
            <div class="metric">
                <div class="metric-value" id="total-checks">0</div>
                <div>Total Checks</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="passed-checks">0</div>
                <div>Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="failed-checks">0</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value" id="warning-checks">0</div>
                <div>Warnings</div>
            </div>
        </div>
EOF
}

# Counters for report
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Add check result to report
add_check_result() {
    local status="$1"
    local title="$2"
    local description="$3"
    local details="${4:-}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case "$status" in
        "PASS")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            class="pass"
            icon="✅"
            ;;
        "FAIL")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            class="fail"
            icon="❌"
            ;;
        "WARN")
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            class="warn"
            icon="⚠️"
            ;;
        "INFO")
            class="info"
            icon="ℹ️"
            ;;
    esac
    
    cat >> "$REPORT_FILE" << EOF
        <div class="status $class">
            <h3>$icon $title</h3>
            <p>$description</p>
            $(if [ -n "$details" ]; then echo "<div class=\"code\">$details</div>"; fi)
        </div>
EOF
    
    log "$status" "$title: $description"
}

# Check Docker daemon configuration
check_docker_daemon() {
    print_status "$PURPLE" "🐳 Checking Docker Daemon Configuration..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        add_check_result "FAIL" "Docker Daemon Status" "Docker daemon is not running or accessible"
        return
    fi
    
    add_check_result "PASS" "Docker Daemon Status" "Docker daemon is running and accessible"
    
    # Check Docker version
    local docker_version
    docker_version=$(docker --version 2>/dev/null || echo "Unknown")
    add_check_result "INFO" "Docker Version" "Version information" "$docker_version"
    
    # Check for rootless mode
    if docker info 2>/dev/null | grep -q "rootless"; then
        add_check_result "PASS" "Docker Rootless Mode" "Docker is running in rootless mode (enhanced security)"
    else
        add_check_result "WARN" "Docker Rootless Mode" "Docker is running as root (consider rootless mode for enhanced security)"
    fi
    
    # Check user namespace remapping
    if docker info 2>/dev/null | grep -q "userns"; then
        add_check_result "PASS" "User Namespace Remapping" "User namespace remapping is enabled"
    else
        add_check_result "WARN" "User Namespace Remapping" "User namespace remapping is not enabled (consider enabling for container isolation)"
    fi
    
    # Check Docker socket permissions
    if [ -S /var/run/docker.sock ]; then
        local socket_perms
        socket_perms=$(ls -la /var/run/docker.sock)
        if echo "$socket_perms" | grep -q "srw-rw----"; then
            add_check_result "PASS" "Docker Socket Permissions" "Docker socket has secure permissions" "$socket_perms"
        else
            add_check_result "WARN" "Docker Socket Permissions" "Docker socket permissions may be too permissive" "$socket_perms"
        fi
    fi
}

# Check Dockerfile security
check_dockerfile_security() {
    print_status "$PURPLE" "📋 Checking Dockerfile Security..."
    
    local dockerfile_paths=(
        "Dockerfile"
        "Dockerfile.production"
        "Dockerfile.secure"
        "Dockerfile.dev"
    )
    
    for dockerfile in "${dockerfile_paths[@]}"; do
        local filepath="$PROJECT_ROOT/$dockerfile"
        if [ -f "$filepath" ]; then
            check_dockerfile_file "$filepath" "$dockerfile"
        fi
    done
}

check_dockerfile_file() {
    local filepath="$1"
    local filename="$2"
    
    print_status "$CYAN" "  📄 Analyzing $filename..."
    
    # Check for non-root user
    if grep -q "USER.*[^0]" "$filepath"; then
        add_check_result "PASS" "$filename: Non-root User" "Dockerfile runs as non-root user"
    else
        add_check_result "FAIL" "$filename: Non-root User" "Dockerfile should specify a non-root USER instruction"
    fi
    
    # Check for specific version tags
    if grep -E "FROM.*:[0-9]" "$filepath" | grep -qv "latest"; then
        add_check_result "PASS" "$filename: Specific Version Tags" "Uses specific version tags instead of 'latest'"
    else
        add_check_result "WARN" "$filename: Specific Version Tags" "Consider using specific version tags instead of 'latest' for reproducibility"
    fi
    
    # Check for package updates
    if grep -q "apk.*update\|apt.*update\|yum.*update" "$filepath"; then
        add_check_result "PASS" "$filename: Package Updates" "Includes package update commands"
    else
        add_check_result "WARN" "$filename: Package Updates" "Consider including package update commands for security patches"
    fi
    
    # Check for COPY vs ADD
    if grep -q "^ADD " "$filepath" && ! grep -q "ADD.*http" "$filepath"; then
        add_check_result "WARN" "$filename: COPY vs ADD" "Consider using COPY instead of ADD for local files"
    elif grep -q "^COPY " "$filepath"; then
        add_check_result "PASS" "$filename: COPY vs ADD" "Uses COPY for local files (good practice)"
    fi
    
    # Check for HEALTHCHECK
    if grep -q "HEALTHCHECK" "$filepath"; then
        add_check_result "PASS" "$filename: Health Check" "Includes HEALTHCHECK instruction"
    else
        add_check_result "WARN" "$filename: Health Check" "Consider adding HEALTHCHECK instruction for container monitoring"
    fi
    
    # Check for secrets in build
    if grep -qE "password|secret|key|token" "$filepath" && ! grep -q "ARG\|ENV" "$filepath"; then
        add_check_result "WARN" "$filename: Secrets Handling" "Potential hardcoded secrets detected - use build args or runtime secrets"
    fi
    
    # Check for multi-stage builds
    if grep -q "FROM.*AS" "$filepath"; then
        add_check_result "PASS" "$filename: Multi-stage Build" "Uses multi-stage build for smaller, more secure images"
    else
        add_check_result "INFO" "$filename: Multi-stage Build" "Consider using multi-stage builds to reduce image size and attack surface"
    fi
}

# Check Docker Compose security
check_docker_compose_security() {
    print_status "$PURPLE" "🐙 Checking Docker Compose Security..."
    
    local compose_files=(
        "docker-compose.yml"
        "docker-compose.production.yml"
        "docker-compose.secure.yml"
        "docker-compose.dev.yml"
    )
    
    for compose_file in "${compose_files[@]}"; do
        local filepath="$PROJECT_ROOT/$compose_file"
        if [ -f "$filepath" ]; then
            check_compose_file "$filepath" "$compose_file"
        fi
    done
}

check_compose_file() {
    local filepath="$1"
    local filename="$2"
    
    print_status "$CYAN" "  📄 Analyzing $filename..."
    
    # Check for version specification
    if grep -q "version.*['\"]3" "$filepath"; then
        add_check_result "PASS" "$filename: Compose Version" "Uses Docker Compose version 3.x"
    else
        add_check_result "WARN" "$filename: Compose Version" "Consider using Docker Compose version 3.x for latest features"
    fi
    
    # Check for resource limits
    if grep -q "resources:" "$filepath"; then
        add_check_result "PASS" "$filename: Resource Limits" "Includes resource limits for containers"
    else
        add_check_result "WARN" "$filename: Resource Limits" "Consider adding resource limits to prevent DoS attacks"
    fi
    
    # Check for security options
    if grep -q "security_opt:" "$filepath"; then
        add_check_result "PASS" "$filename: Security Options" "Includes security_opt configurations"
    else
        add_check_result "WARN" "$filename: Security Options" "Consider adding security_opt for enhanced container security"
    fi
    
    # Check for read-only filesystem
    if grep -q "read_only.*true" "$filepath"; then
        add_check_result "PASS" "$filename: Read-only Filesystem" "Uses read-only filesystem for containers"
    else
        add_check_result "INFO" "$filename: Read-only Filesystem" "Consider using read-only filesystem where possible"
    fi
    
    # Check for user specification
    if grep -q "user:" "$filepath"; then
        add_check_result "PASS" "$filename: User Specification" "Specifies user for containers"
    else
        add_check_result "WARN" "$filename: User Specification" "Consider specifying user to avoid running as root"
    fi
    
    # Check for secrets management
    if grep -q "secrets:" "$filepath"; then
        add_check_result "PASS" "$filename: Secrets Management" "Uses Docker secrets for sensitive data"
    else
        add_check_result "WARN" "$filename: Secrets Management" "Consider using Docker secrets instead of environment variables for sensitive data"
    fi
    
    # Check for network isolation
    if grep -q "internal.*true" "$filepath"; then
        add_check_result "PASS" "$filename: Network Isolation" "Includes internal networks for isolation"
    else
        add_check_result "INFO" "$filename: Network Isolation" "Consider using internal networks for database isolation"
    fi
    
    # Check for health checks
    if grep -q "healthcheck:" "$filepath"; then
        add_check_result "PASS" "$filename: Health Checks" "Includes health checks for services"
    else
        add_check_result "WARN" "$filename: Health Checks" "Consider adding health checks for all services"
    fi
}

# Check running container security
check_container_security() {
    print_status "$PURPLE" "🏃 Checking Running Container Security..."
    
    # Get list of running containers
    local containers
    if ! containers=$(docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null); then
        add_check_result "INFO" "Container Analysis" "No running containers found or Docker not accessible"
        return
    fi
    
    # Check each running container
    while IFS=$'\t' read -r name image status; do
        if [ "$name" != "NAMES" ]; then  # Skip header
            check_individual_container "$name" "$image"
        fi
    done <<< "$containers"
}

check_individual_container() {
    local container_name="$1"
    local image_name="$2"
    
    print_status "$CYAN" "  🔍 Analyzing container: $container_name"
    
    # Check if running as root
    local user_info
    if user_info=$(docker exec "$container_name" id 2>/dev/null); then
        if echo "$user_info" | grep -q "uid=0(root)"; then
            add_check_result "WARN" "$container_name: Root User" "Container is running as root user" "$user_info"
        else
            add_check_result "PASS" "$container_name: Root User" "Container is running as non-root user" "$user_info"
        fi
    fi
    
    # Check container capabilities
    local caps_info
    if caps_info=$(docker inspect "$container_name" --format '{{.HostConfig.CapAdd}} {{.HostConfig.CapDrop}}' 2>/dev/null); then
        if echo "$caps_info" | grep -q "ALL"; then
            add_check_result "WARN" "$container_name: Capabilities" "Container has excessive capabilities" "$caps_info"
        else
            add_check_result "PASS" "$container_name: Capabilities" "Container capabilities appear restricted" "$caps_info"
        fi
    fi
    
    # Check for privileged mode
    local privileged
    if privileged=$(docker inspect "$container_name" --format '{{.HostConfig.Privileged}}' 2>/dev/null); then
        if [ "$privileged" = "true" ]; then
            add_check_result "FAIL" "$container_name: Privileged Mode" "Container is running in privileged mode (high security risk)"
        else
            add_check_result "PASS" "$container_name: Privileged Mode" "Container is not running in privileged mode"
        fi
    fi
    
    # Check for read-only root filesystem
    local readonly_root
    if readonly_root=$(docker inspect "$container_name" --format '{{.HostConfig.ReadonlyRootfs}}' 2>/dev/null); then
        if [ "$readonly_root" = "true" ]; then
            add_check_result "PASS" "$container_name: Read-only Filesystem" "Container uses read-only root filesystem"
        else
            add_check_result "INFO" "$container_name: Read-only Filesystem" "Container does not use read-only root filesystem"
        fi
    fi
    
    # Check resource limits
    local memory_limit
    if memory_limit=$(docker inspect "$container_name" --format '{{.HostConfig.Memory}}' 2>/dev/null); then
        if [ "$memory_limit" != "0" ]; then
            add_check_result "PASS" "$container_name: Memory Limit" "Container has memory limits configured" "Limit: $memory_limit bytes"
        else
            add_check_result "WARN" "$container_name: Memory Limit" "Container has no memory limits (potential DoS risk)"
        fi
    fi
}

# Check image security
check_image_security() {
    print_status "$PURPLE" "🏗️ Checking Image Security..."
    
    # Get list of images
    local images
    if ! images=$(docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | grep -v "<none>"); then
        add_check_result "INFO" "Image Analysis" "No images found or Docker not accessible"
        return
    fi
    
    # Check for outdated base images
    local outdated_count=0
    while read -r image; do
        if echo "$image" | grep -q "latest"; then
            outdated_count=$((outdated_count + 1))
        fi
    done <<< "$images"
    
    if [ $outdated_count -gt 0 ]; then
        add_check_result "WARN" "Image Tags" "$outdated_count images use 'latest' tag" "Consider using specific version tags"
    else
        add_check_result "PASS" "Image Tags" "All images use specific version tags"
    fi
    
    # Check for image size (potential bloat)
    local large_images=0
    while read -r image; do
        local size
        if size=$(docker images "$image" --format "{{.Size}}" 2>/dev/null | head -1); then
            if echo "$size" | grep -qE "GB|[5-9][0-9][0-9]MB|[1-9][0-9][0-9][0-9]MB"; then
                large_images=$((large_images + 1))
            fi
        fi
    done <<< "$images"
    
    if [ $large_images -gt 0 ]; then
        add_check_result "WARN" "Image Size" "$large_images images are large (>500MB)" "Consider using multi-stage builds or alpine variants"
    else
        add_check_result "PASS" "Image Size" "All images appear reasonably sized"
    fi
}

# Check network security
check_network_security() {
    print_status "$PURPLE" "🌐 Checking Network Security..."
    
    # Check for custom networks
    local networks
    if networks=$(docker network ls --format "{{.Name}}" 2>/dev/null | grep -v "bridge\|host\|none"); then
        add_check_result "PASS" "Custom Networks" "Custom networks are in use for isolation" "$networks"
    else
        add_check_result "WARN" "Custom Networks" "No custom networks detected - consider using custom networks for isolation"
    fi
    
    # Check for exposed ports
    local exposed_containers
    if exposed_containers=$(docker ps --format "{{.Names}}: {{.Ports}}" 2>/dev/null | grep "0.0.0.0"); then
        local exposed_count
        exposed_count=$(echo "$exposed_containers" | wc -l)
        add_check_result "WARN" "Exposed Ports" "$exposed_count containers have ports exposed to all interfaces" "$exposed_containers"
    else
        add_check_result "PASS" "Exposed Ports" "No containers expose ports to all interfaces (0.0.0.0)"
    fi
}

# Check volume security
check_volume_security() {
    print_status "$PURPLE" "💾 Checking Volume Security..."
    
    # Check for sensitive host mounts
    local sensitive_mounts
    if sensitive_mounts=$(docker ps --format "{{.Names}}" 2>/dev/null | xargs -I {} docker inspect {} --format '{{.Name}}: {{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}' 2>/dev/null | grep -E "/etc|/var|/usr|/root|/home"); then
        add_check_result "WARN" "Sensitive Host Mounts" "Containers have sensitive host directory mounts" "$sensitive_mounts"
    else
        add_check_result "PASS" "Sensitive Host Mounts" "No sensitive host directory mounts detected"
    fi
    
    # Check for Docker socket mounts
    local docker_socket_mounts
    if docker_socket_mounts=$(docker ps --format "{{.Names}}" 2>/dev/null | xargs -I {} docker inspect {} --format '{{.Name}}: {{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}' 2>/dev/null | grep "docker.sock"); then
        add_check_result "FAIL" "Docker Socket Mounts" "Containers have Docker socket mounted (high security risk)" "$docker_socket_mounts"
    else
        add_check_result "PASS" "Docker Socket Mounts" "No Docker socket mounts detected"
    fi
    
    # Check volume permissions
    local volumes
    if volumes=$(docker volume ls -q 2>/dev/null); then
        local volume_count
        volume_count=$(echo "$volumes" | wc -l)
        add_check_result "INFO" "Docker Volumes" "$volume_count Docker volumes found" "$volumes"
    fi
}

# Run vulnerability scanning if trivy is available
check_vulnerabilities() {
    print_status "$PURPLE" "🔍 Checking for Vulnerabilities..."
    
    if command -v trivy >/dev/null 2>&1; then
        print_status "$CYAN" "  🔍 Running Trivy vulnerability scan..."
        
        # Scan local images
        local images
        if images=$(docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | grep -v "<none>" | head -5); then
            while read -r image; do
                local vuln_output
                if vuln_output=$(trivy image --exit-code 1 --severity HIGH,CRITICAL "$image" 2>&1); then
                    add_check_result "PASS" "Vulnerability Scan: $image" "No HIGH/CRITICAL vulnerabilities found"
                else
                    local vuln_count
                    vuln_count=$(echo "$vuln_output" | grep -c "HIGH\|CRITICAL" || echo "0")
                    add_check_result "FAIL" "Vulnerability Scan: $image" "$vuln_count HIGH/CRITICAL vulnerabilities found" "${vuln_output:0:1000}..."
                fi
            done <<< "$images"
        fi
    else
        add_check_result "INFO" "Vulnerability Scanning" "Trivy not available - install for vulnerability scanning"
    fi
    
    # Check for security updates in package files
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        if command -v npm >/dev/null 2>&1; then
            local audit_output
            if audit_output=$(cd "$PROJECT_ROOT" && npm audit --json 2>/dev/null); then
                local vuln_count
                vuln_count=$(echo "$audit_output" | grep -o '"severity":"high"\|"severity":"critical"' | wc -l)
                if [ "$vuln_count" -gt 0 ]; then
                    add_check_result "WARN" "NPM Audit" "$vuln_count high/critical npm vulnerabilities found" "Run 'npm audit fix' to resolve"
                else
                    add_check_result "PASS" "NPM Audit" "No high/critical npm vulnerabilities found"
                fi
            fi
        fi
    fi
}

# Generate final report
finalize_report() {
    print_status "$BLUE" "📊 Generating Security Report..."
    
    # Update counters in HTML
    cat >> "$REPORT_FILE" << EOF
        
        <h2>📋 Audit Summary</h2>
        <div class="status info">
            <h3>ℹ️ Audit Complete</h3>
            <p>Security audit completed successfully. Total checks performed: $TOTAL_CHECKS</p>
            <ul>
                <li><strong>Passed:</strong> $PASSED_CHECKS</li>
                <li><strong>Failed:</strong> $FAILED_CHECKS</li>
                <li><strong>Warnings:</strong> $WARNING_CHECKS</li>
            </ul>
        </div>
        
        <h2>🚀 Recommendations</h2>
        <div class="status info">
            <h3>🎯 Security Best Practices</h3>
            <ul>
                <li>Regularly update base images and dependencies</li>
                <li>Use multi-stage builds to minimize attack surface</li>
                <li>Implement proper secrets management</li>
                <li>Use read-only filesystems where possible</li>
                <li>Regularly scan images for vulnerabilities</li>
                <li>Implement container runtime security monitoring</li>
                <li>Use network segmentation and custom networks</li>
                <li>Apply principle of least privilege</li>
            </ul>
        </div>
        
        <script>
            document.getElementById('total-checks').textContent = '$TOTAL_CHECKS';
            document.getElementById('passed-checks').textContent = '$PASSED_CHECKS';
            document.getElementById('failed-checks').textContent = '$FAILED_CHECKS';
            document.getElementById('warning-checks').textContent = '$WARNING_CHECKS';
        </script>
    </div>
</body>
</html>
EOF
    
    # Calculate security score
    local security_score
    if [ $TOTAL_CHECKS -gt 0 ]; then
        security_score=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
    else
        security_score=0
    fi
    
    print_status "$GREEN" "✅ Security Audit Complete!"
    print_status "$CYAN" "📊 Security Score: ${security_score}%"
    print_status "$CYAN" "📋 Audit Log: $AUDIT_LOG"
    print_status "$CYAN" "📊 HTML Report: $REPORT_FILE"
    
    if [ $security_score -lt 70 ]; then
        print_status "$RED" "⚠️  Security score is below 70% - immediate attention required!"
        exit 1
    elif [ $security_score -lt 85 ]; then
        print_status "$YELLOW" "⚠️  Security score is below 85% - improvements recommended"
        exit 0
    else
        print_status "$GREEN" "🎉 Excellent security score! Keep up the good work."
        exit 0
    fi
}

# Main execution
main() {
    init_audit
    check_docker_daemon
    check_dockerfile_security
    check_docker_compose_security
    check_container_security
    check_image_security
    check_network_security
    check_volume_security
    check_vulnerabilities
    finalize_report
}

# Run the audit
main "$@"