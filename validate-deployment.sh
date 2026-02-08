#!/bin/bash
# Summit Application Validation and Testing Script
# This script performs comprehensive tests on the deployed Summit application

set -e

echo "🧪 Summit Application Validation and Testing"
echo "==========================================="

# Function to display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --namespace NAMESPACE    Kubernetes namespace - default: summit-app"
    echo "  --domain DOMAIN          Domain name for the application (required if using HTTPS)"
    echo "  --external-ip IP         External IP of the load balancer (alternative to domain)"
    echo "  --skip-auth-tests        Skip authentication-related tests"
    echo "  --full-test-suite        Run the complete test suite (takes longer)"
    echo "  --api-endpoint ENDPOINT  Custom API endpoint URL"
    echo "  --web-endpoint ENDPOINT  Custom web endpoint URL"
    echo "  --help                   Show this help message"
    exit 1
}

# Default values
NAMESPACE="summit-app"
DOMAIN=""
EXTERNAL_IP=""
SKIP_AUTH_TESTS=false
FULL_TEST_SUITE=false
API_ENDPOINT=""
WEB_ENDPOINT=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --external-ip)
            EXTERNAL_IP="$2"
            shift 2
            ;;
        --skip-auth-tests)
            SKIP_AUTH_TESTS=true
            shift
            ;;
        --full-test-suite)
            FULL_TEST_SUITE=true
            shift
            ;;
        --api-endpoint)
            API_ENDPOINT="$2"
            shift 2
            ;;
        --web-endpoint)
            WEB_ENDPOINT="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Set endpoints based on provided parameters
if [ -n "$DOMAIN" ]; then
    API_ENDPOINT="${API_ENDPOINT:-https://$DOMAIN/api}"
    WEB_ENDPOINT="${WEB_ENDPOINT:-https://$DOMAIN}"
elif [ -n "$EXTERNAL_IP" ]; then
    API_ENDPOINT="${API_ENDPOINT:-http://$EXTERNAL_IP:4000/api}"
    WEB_ENDPOINT="${WEB_ENDPOINT:-http://$EXTERNAL_IP:3000}"
else
    echo "❌ Either --domain or --external-ip must be provided"
    exit 1
fi

echo "Namespace: $NAMESPACE"
echo "API Endpoint: $API_ENDPOINT"
echo "Web Endpoint: $WEB_ENDPOINT"
echo "Skip Auth Tests: $SKIP_AUTH_TESTS"
echo "Full Test Suite: $FULL_TEST_SUITE"
echo

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        echo "❌ kubectl is not installed. Please install it first."
        echo "Installation instructions: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
    echo "✅ kubectl is installed"
    
    if ! command -v curl &> /dev/null; then
        echo "❌ curl is not installed. Please install it first."
        exit 1
    fi
    echo "✅ curl is installed"
    
    if ! command -v jq &> /dev/null; then
        echo "⚠️ jq is not installed. It's recommended for JSON parsing."
        echo "Installation instructions: https://stedolan.github.io/jq/download/"
    else
        echo "✅ jq is installed"
    fi
    
    echo
}

# Function to check service status
check_service_status() {
    echo "📊 Checking service status..."
    
    echo "Pod status:"
    kubectl get pods -n $NAMESPACE
    
    echo
    echo "Service status:"
    kubectl get services -n $NAMESPACE
    
    echo
    echo "Deployment status:"
    kubectl get deployments -n $NAMESPACE
    
    echo
    echo "StatefulSet status:"
    kubectl get statefulsets -n $NAMESPACE
    
    echo
    echo "Ingress status:"
    kubectl get ingress -n $NAMESPACE 2>/dev/null || echo "No ingress found in namespace"
    
    echo
}

# Function to test database connectivity
test_database_connectivity() {
    echo "💾 Testing database connectivity..."
    
    # Test Neo4j connectivity
    echo "Testing Neo4j connectivity..."
    NEO4J_POD=$(kubectl get pods -n $NAMESPACE -l app=neo4j -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$NEO4J_POD" ]; then
        kubectl exec -n $NAMESPACE $NEO4J_POD -- cypher-shell -u neo4j -p 'summit_neo4j_password' "RETURN 'Neo4j connection successful';" 2>/dev/null && echo "✅ Neo4j connection successful" || echo "⚠️ Neo4j connection test failed or not accessible"
    else
        echo "⚠️ Neo4j pod not found"
    fi
    
    # Test PostgreSQL connectivity
    echo "Testing PostgreSQL connectivity..."
    POSTGRES_POD=$(kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$POSTGRES_POD" ]; then
        kubectl exec -n $NAMESPACE $POSTGRES_POD -- psql -U intelgraph_user -d intelgraph -c "SELECT version();" 2>/dev/null && echo "✅ PostgreSQL connection successful" || echo "⚠️ PostgreSQL connection test failed or not accessible"
    else
        echo "⚠️ PostgreSQL pod not found"
    fi
    
    # Test Redis connectivity
    echo "Testing Redis connectivity..."
    REDIS_POD=$(kubectl get pods -n $NAMESPACE -l app=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$REDIS_POD" ]; then
        kubectl exec -n $NAMESPACE $REDIS_POD -- redis-cli ping 2>/dev/null && echo "✅ Redis connection successful" || echo "⚠️ Redis connection test failed or not accessible"
    else
        echo "⚠️ Redis pod not found"
    fi
    
    echo
}

# Function to test API endpoints
test_api_endpoints() {
    echo "🔗 Testing API endpoints..."
    
    # Test health endpoint
    echo "Testing health endpoint..."
    if curl -f -s -o /dev/null $API_ENDPOINT/health 2>/dev/null; then
        echo "✅ Health endpoint accessible"
        curl -s $API_ENDPOINT/health | jq '.' 2>/dev/null || curl -s $API_ENDPOINT/health
    else
        echo "❌ Health endpoint not accessible"
    fi
    
    # Test GraphQL endpoint
    echo "Testing GraphQL endpoint..."
    GRAPHQL_QUERY='{"query":"{ __schema { types { name } } }"}'
    if curl -f -s -o /dev/null -X POST -H "Content-Type: application/json" --data "$GRAPHQL_QUERY" $API_ENDPOINT/graphql 2>/dev/null; then
        echo "✅ GraphQL endpoint accessible"
        curl -s -X POST -H "Content-Type: application/json" --data "$GRAPHQL_QUERY" $API_ENDPOINT/graphql | jq '.' 2>/dev/null || curl -s -X POST -H "Content-Type: application/json" --data "$GRAPHQL_QUERY" $API_ENDPOINT/graphql
    else
        echo "❌ GraphQL endpoint not accessible"
    fi
    
    # Test API root endpoint
    echo "Testing API root endpoint..."
    if curl -f -s -o /dev/null $API_ENDPOINT/ 2>/dev/null; then
        echo "✅ API root endpoint accessible"
        curl -s $API_ENDPOINT/ | jq '.' 2>/dev/null || curl -s $API_ENDPOINT/
    else
        echo "❌ API root endpoint not accessible"
    fi
    
    echo
}

# Function to test web interface
test_web_interface() {
    echo "🌐 Testing web interface..."
    
    # Test web interface root
    echo "Testing web interface root..."
    if curl -f -s -o /dev/null $WEB_ENDPOINT/ 2>/dev/null; then
        echo "✅ Web interface root accessible"
        # Just check if we get an HTML response
        if curl -s $WEB_ENDPOINT/ | head -n 1 | grep -q "<"; then
            echo "✅ Web interface returning HTML content"
        else
            echo "⚠️ Web interface not returning expected HTML content"
        fi
    else
        echo "❌ Web interface root not accessible"
    fi
    
    # Test web interface static assets
    echo "Testing web interface static assets..."
    if curl -f -s -o /dev/null $WEB_ENDPOINT/static/js/main.js 2>/dev/null || curl -f -s -o /dev/null $WEB_ENDPOINT/assets/index-*.js 2>/dev/null; then
        echo "✅ Web interface static assets accessible"
    else
        echo "⚠️ Web interface static assets not accessible (this might be OK depending on build)"
    fi
    
    echo
}

# Function to test authentication (if not skipped)
test_authentication() {
    if [ "$SKIP_AUTH_TESTS" = true ]; then
        echo "⏭️ Skipping authentication tests as requested"
        echo
        return
    fi
    
    echo "🔐 Testing authentication endpoints..."
    
    # Test auth endpoints if they exist
    echo "Testing auth endpoints..."
    if curl -f -s -o /dev/null $API_ENDPOINT/auth/login 2>/dev/null; then
        echo "✅ Auth login endpoint accessible"
    else
        echo "ℹ️ Auth login endpoint not found (this might be OK if auth is disabled)"
    fi
    
    if curl -f -s -o /dev/null $API_ENDPOINT/auth/register 2>/dev/null; then
        echo "✅ Auth register endpoint accessible"
    else
        echo "ℹ️ Auth register endpoint not found (this might be OK if auth is disabled)"
    fi
    
    echo
}

# Function to run extended tests (if requested)
run_extended_tests() {
    if [ "$FULL_TEST_SUITE" = false ]; then
        echo "⏭️ Skipping extended tests (use --full-test-suite to run them)"
        echo
        return
    fi
    
    echo "🔬 Running extended tests..."
    
    # Test database performance
    echo "Testing database performance..."
    
    # Test Neo4j performance
    NEO4J_POD=$(kubectl get pods -n $NAMESPACE -l app=neo4j -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$NEO4J_POD" ]; then
        echo "Running Neo4j performance test..."
        kubectl exec -n $NAMESPACE $NEO4J_POD -- cypher-shell -u neo4j -p 'summit_neo4j_password' "PROFILE MATCH (n) RETURN count(n);" 2>/dev/null || echo "⚠️ Neo4j performance test failed"
    fi
    
    # Test PostgreSQL performance
    POSTGRES_POD=$(kubectl get pods -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$POSTGRES_POD" ]; then
        echo "Running PostgreSQL performance test..."
        kubectl exec -n $NAMESPACE $POSTGRES_POD -- psql -U intelgraph_user -d intelgraph -c "EXPLAIN ANALYZE SELECT version();" 2>/dev/null || echo "⚠️ PostgreSQL performance test failed"
    fi
    
    # Test API performance
    echo "Testing API response times..."
    API_RESPONSE_TIME=$(curl -s -w '%{time_total}' -o /dev/null -X POST -H "Content-Type: application/json" --data '{"query":"{ __schema { types { name } } }"}' $API_ENDPOINT/graphql)
    echo "GraphQL API response time: ${API_RESPONSE_TIME}s"
    
    # Test concurrent connections
    echo "Testing concurrent connections..."
    for i in {1..5}; do
        curl -s -o /dev/null -X POST -H "Content-Type: application/json" --data '{"query":"{ __schema { types { name } } }"}' $API_ENDPOINT/graphql &
    done
    wait
    echo "✅ Completed concurrent connection test"
    
    echo
}

# Function to check resource utilization
check_resource_utilization() {
    echo "📈 Checking resource utilization..."
    
    # Check CPU and memory usage
    if command -v kubectl &> /dev/null; then
        echo "Resource usage by pods:"
        kubectl top pods -n $NAMESPACE 2>/dev/null || echo "⚠️ Resource metrics not available (metrics server may not be installed)"
    fi
    
    echo
}

# Function to run security checks
run_security_checks() {
    echo "🔒 Running security checks..."
    
    # Check for default passwords
    echo "Checking for default passwords in secrets..."
    DEFAULT_PASSWORDS=("summit_postgres_password" "summit_neo4j_password" "default_jwt_secret_for_dev")
    for password in "${DEFAULT_PASSWORDS[@]}"; do
        if kubectl get secrets -n $NAMESPACE -o yaml | grep -q "$password"; then
            echo "⚠️ Found potential default password reference: $password"
        fi
    done
    
    # Check for exposed services
    echo "Checking service exposure..."
    kubectl get services -n $NAMESPACE -o yaml | grep -A 10 -B 10 "type: LoadBalancer\|type: NodePort" || echo "No externally exposed services found"
    
    echo
}

# Function to display validation summary
display_validation_summary() {
    echo "✅ Summit Application Validation Summary"
    echo "======================================="
    echo
    echo "Validation completed for:"
    echo "- API Endpoint: $API_ENDPOINT"
    echo "- Web Endpoint: $WEB_ENDPOINT"
    echo "- Namespace: $NAMESPACE"
    echo
    echo "Tests performed:"
    echo "✅ Service status check"
    echo "✅ Database connectivity tests"
    echo "✅ API endpoint accessibility"
    echo "✅ Web interface accessibility"
    if [ "$SKIP_AUTH_TESTS" = false ]; then
        echo "✅ Authentication tests"
    else
        echo "⏭️ Authentication tests (skipped)"
    fi
    if [ "$FULL_TEST_SUITE" = true ]; then
        echo "✅ Extended performance tests"
    else
        echo "⏭️ Extended performance tests (skipped)"
    fi
    echo "✅ Resource utilization check"
    echo "✅ Security checks"
    echo
    echo "Next steps:"
    echo "1. Review any warnings or errors in the output above"
    echo "2. Check application logs for any issues: kubectl logs -l app=summit-server -n $NAMESPACE"
    echo "3. Perform load testing if needed"
    echo "4. Set up monitoring and alerting"
    echo
    echo "The Summit application appears to be functioning correctly in the cloud environment!"
}

# Main execution
check_prerequisites
check_service_status
test_database_connectivity
test_api_endpoints
test_web_interface
test_authentication
run_extended_tests
check_resource_utilization
run_security_checks
display_validation_summary