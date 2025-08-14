#!/bin/sh

# Docker-based Auto-scaler for IntelGraph
# This is a simplified autoscaler for Docker Compose environments
# In production, use Kubernetes HPA or cloud-native autoscaling

set -e

# Configuration from environment variables
CHECK_INTERVAL=${CHECK_INTERVAL:-60}
CPU_THRESHOLD=${CPU_THRESHOLD:-70}
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-80}
MIN_INSTANCES=${MIN_INSTANCES:-3}
MAX_INSTANCES=${MAX_INSTANCES:-10}
SCALE_UP_COOLDOWN=${SCALE_UP_COOLDOWN:-300}
SCALE_DOWN_COOLDOWN=${SCALE_DOWN_COOLDOWN:-600}

# Internal state
LAST_SCALE_UP=0
LAST_SCALE_DOWN=0
CURRENT_INSTANCES=$MIN_INSTANCES

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] AUTOSCALER: $1"
}

get_container_stats() {
    local container_name=$1
    docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemPerc}}" $container_name 2>/dev/null | tail -n +2 | head -1
}

get_average_cpu() {
    local total_cpu=0
    local count=0
    
    for i in $(seq 1 $CURRENT_INSTANCES); do
        local container_name="intelgraph-app-$i"
        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
            local stats=$(get_container_stats $container_name)
            if [ ! -z "$stats" ]; then
                local cpu=$(echo $stats | cut -d' ' -f1 | sed 's/%//')
                total_cpu=$(echo "$total_cpu + $cpu" | bc)
                count=$((count + 1))
            fi
        fi
    done
    
    if [ $count -gt 0 ]; then
        echo "scale=2; $total_cpu / $count" | bc
    else
        echo "0"
    fi
}

get_average_memory() {
    local total_memory=0
    local count=0
    
    for i in $(seq 1 $CURRENT_INSTANCES); do
        local container_name="intelgraph-app-$i"
        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
            local stats=$(get_container_stats $container_name)
            if [ ! -z "$stats" ]; then
                local memory=$(echo $stats | cut -d' ' -f2 | sed 's/%//')
                total_memory=$(echo "$total_memory + $memory" | bc)
                count=$((count + 1))
            fi
        fi
    done
    
    if [ $count -gt 0 ]; then
        echo "scale=2; $total_memory / $count" | bc
    else
        echo "0"
    fi
}

should_scale_up() {
    local cpu=$1
    local memory=$2
    local now=$(date +%s)
    local cooldown_passed=$((now - LAST_SCALE_UP))
    
    if [ $cooldown_passed -lt $SCALE_UP_COOLDOWN ]; then
        return 1
    fi
    
    if [ $CURRENT_INSTANCES -ge $MAX_INSTANCES ]; then
        return 1
    fi
    
    # Scale up if CPU > threshold OR memory > threshold
    if [ $(echo "$cpu > $CPU_THRESHOLD" | bc) -eq 1 ] || [ $(echo "$memory > $MEMORY_THRESHOLD" | bc) -eq 1 ]; then
        return 0
    fi
    
    return 1
}

should_scale_down() {
    local cpu=$1
    local memory=$2
    local now=$(date +%s)
    local cooldown_passed=$((now - LAST_SCALE_DOWN))
    
    if [ $cooldown_passed -lt $SCALE_DOWN_COOLDOWN ]; then
        return 1
    fi
    
    if [ $CURRENT_INSTANCES -le $MIN_INSTANCES ]; then
        return 1
    fi
    
    # Scale down if CPU < (threshold - 20) AND memory < (threshold - 20)
    local scale_down_cpu_threshold=$((CPU_THRESHOLD - 20))
    local scale_down_memory_threshold=$((MEMORY_THRESHOLD - 20))
    
    if [ $(echo "$cpu < $scale_down_cpu_threshold" | bc) -eq 1 ] && [ $(echo "$memory < $scale_down_memory_threshold" | bc) -eq 1 ]; then
        return 0
    fi
    
    return 1
}

scale_up() {
    local new_instance=$((CURRENT_INSTANCES + 1))
    local container_name="intelgraph-app-$new_instance"
    
    log "Scaling up: Creating $container_name"
    
    # Create new container based on existing configuration
    docker run -d \
        --name $container_name \
        --network intelgraph-network \
        --restart unless-stopped \
        -e NODE_ENV=production \
        -e PORT=4000 \
        -e INSTANCE_ID=app-$new_instance \
        -e NEO4J_URI=bolt://neo4j:7687 \
        -e NEO4J_USERNAME=neo4j \
        -e NEO4J_PASSWORD=${NEO4J_PASSWORD} \
        -e POSTGRES_HOST=postgres \
        -e POSTGRES_PORT=5432 \
        -e POSTGRES_DB=${POSTGRES_DB} \
        -e POSTGRES_USER=${POSTGRES_USER} \
        -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
        -e REDIS_HOST=redis \
        -e REDIS_PORT=6379 \
        -e REDIS_PASSWORD=${REDIS_PASSWORD} \
        -e JWT_SECRET=${JWT_SECRET} \
        -e JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET} \
        -v app_uploads:/app/uploads \
        intelgraph-server:latest
    
    if [ $? -eq 0 ]; then
        CURRENT_INSTANCES=$new_instance
        LAST_SCALE_UP=$(date +%s)
        log "Successfully scaled up to $CURRENT_INSTANCES instances"
        
        # Update NGINX configuration to include new instance
        update_nginx_config
        
        # Send notification
        send_notification "IntelGraph scaled up to $CURRENT_INSTANCES instances"
    else
        log "Failed to scale up"
    fi
}

scale_down() {
    local container_name="intelgraph-app-$CURRENT_INSTANCES"
    
    log "Scaling down: Removing $container_name"
    
    # Gracefully stop container
    docker stop $container_name
    docker rm $container_name
    
    if [ $? -eq 0 ]; then
        CURRENT_INSTANCES=$((CURRENT_INSTANCES - 1))
        LAST_SCALE_DOWN=$(date +%s)
        log "Successfully scaled down to $CURRENT_INSTANCES instances"
        
        # Update NGINX configuration
        update_nginx_config
        
        # Send notification
        send_notification "IntelGraph scaled down to $CURRENT_INSTANCES instances"
    else
        log "Failed to scale down"
    fi
}

update_nginx_config() {
    log "Updating NGINX configuration for $CURRENT_INSTANCES instances"
    
    # Generate new upstream configuration
    local upstream_config=""
    for i in $(seq 1 $CURRENT_INSTANCES); do
        upstream_config="$upstream_config        server intelgraph-app-$i:4000 max_fails=3 fail_timeout=30s weight=1;\n"
    done
    
    # This is a simplified example - in practice, you'd use a more robust method
    # to update NGINX configuration and reload it
    log "NGINX configuration would be updated here"
    
    # Reload NGINX configuration
    docker exec intelgraph-nginx nginx -s reload 2>/dev/null || log "Failed to reload NGINX"
}

send_notification() {
    local message=$1
    if [ ! -z "$ALERT_WEBHOOK_URL" ]; then
        curl -X POST "$ALERT_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"message\": \"$message\", \"timestamp\": \"$(date -Iseconds)\"}" \
             2>/dev/null || log "Failed to send notification"
    fi
}

check_health() {
    # Check if all instances are healthy
    local healthy_instances=0
    
    for i in $(seq 1 $CURRENT_INSTANCES); do
        local container_name="intelgraph-app-$i"
        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
            # Check container health
            local health=$(docker inspect --format='{{.State.Health.Status}}' $container_name 2>/dev/null)
            if [ "$health" = "healthy" ]; then
                healthy_instances=$((healthy_instances + 1))
            fi
        fi
    done
    
    local unhealthy_instances=$((CURRENT_INSTANCES - healthy_instances))
    if [ $unhealthy_instances -gt 0 ]; then
        log "Warning: $unhealthy_instances/$CURRENT_INSTANCES instances are unhealthy"
        send_notification "IntelGraph health warning: $unhealthy_instances/$CURRENT_INSTANCES instances unhealthy"
    fi
}

# Install required tools
apk add --no-cache bc curl

log "Starting IntelGraph autoscaler"
log "Configuration: CPU threshold=$CPU_THRESHOLD%, Memory threshold=$MEMORY_THRESHOLD%"
log "Instances: min=$MIN_INSTANCES, max=$MAX_INSTANCES, current=$CURRENT_INSTANCES"
log "Cooldowns: scale-up=${SCALE_UP_COOLDOWN}s, scale-down=${SCALE_DOWN_COOLDOWN}s"

# Main monitoring loop
while true; do
    log "Checking metrics..."
    
    # Get current resource usage
    avg_cpu=$(get_average_cpu)
    avg_memory=$(get_average_memory)
    
    log "Average CPU: ${avg_cpu}%, Average Memory: ${avg_memory}%"
    
    # Check health
    check_health
    
    # Make scaling decisions
    if should_scale_up $avg_cpu $avg_memory; then
        scale_up
    elif should_scale_down $avg_cpu $avg_memory; then
        scale_down
    else
        log "No scaling action needed"
    fi
    
    log "Current instances: $CURRENT_INSTANCES"
    sleep $CHECK_INTERVAL
done