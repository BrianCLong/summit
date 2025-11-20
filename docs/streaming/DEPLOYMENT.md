# Deployment Guide - Real-time Stream Processing Platform

## Overview

This guide covers production deployment of Summit's Real-time Stream Processing and Event Intelligence Platform.

## Architecture Deployment Models

### Single-Node Deployment

For development and small-scale deployments.

```yaml
# docker-compose.yml
version: '3.8'

services:
  streaming-service:
    image: summit/streaming-service:latest
    ports:
      - "3000:3000"
      - "9092:9092"
    environment:
      - NODE_ENV=production
      - BROKER_HOST=0.0.0.0
      - BROKER_PORT=9092
      - DATA_DIR=/data
      - LOG_DIR=/logs
    volumes:
      - stream-data:/data
      - stream-logs:/logs

  event-correlation-service:
    image: summit/event-correlation-service:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - streaming-service

volumes:
  stream-data:
  stream-logs:
```

### Multi-Broker Cluster

For production deployments with high availability.

```yaml
# docker-compose-cluster.yml
version: '3.8'

services:
  broker-1:
    image: summit/streaming-service:latest
    ports:
      - "9092:9092"
    environment:
      - BROKER_ID=0
      - BROKER_HOST=broker-1
      - BROKER_PORT=9092
      - BOOTSTRAP_SERVERS=broker-1:9092,broker-2:9093,broker-3:9094
    volumes:
      - broker1-data:/data
    networks:
      - stream-network

  broker-2:
    image: summit/streaming-service:latest
    ports:
      - "9093:9092"
    environment:
      - BROKER_ID=1
      - BROKER_HOST=broker-2
      - BROKER_PORT=9093
      - BOOTSTRAP_SERVERS=broker-1:9092,broker-2:9093,broker-3:9094
    volumes:
      - broker2-data:/data
    networks:
      - stream-network

  broker-3:
    image: summit/streaming-service:latest
    ports:
      - "9094:9092"
    environment:
      - BROKER_ID=2
      - BROKER_HOST=broker-3
      - BROKER_PORT=9094
      - BOOTSTRAP_SERVERS=broker-1:9092,broker-2:9093,broker-3:9094
    volumes:
      - broker3-data:/data
    networks:
      - stream-network

  correlation-service:
    image: summit/event-correlation-service:latest
    deploy:
      replicas: 3
    environment:
      - BOOTSTRAP_SERVERS=broker-1:9092,broker-2:9093,broker-3:9094
    networks:
      - stream-network

networks:
  stream-network:
    driver: bridge

volumes:
  broker1-data:
  broker2-data:
  broker3-data:
```

## Kubernetes Deployment

### Namespace and ConfigMap

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: streaming-platform

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: streaming-config
  namespace: streaming-platform
data:
  broker.properties: |
    num.partitions=6
    default.replication.factor=3
    min.insync.replicas=2
    log.retention.hours=168
    log.segment.bytes=1073741824
    auto.create.topics.enable=true
```

### StatefulSet for Brokers

```yaml
# broker-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: stream-broker
  namespace: streaming-platform
spec:
  serviceName: stream-broker
  replicas: 3
  selector:
    matchLabels:
      app: stream-broker
  template:
    metadata:
      labels:
        app: stream-broker
    spec:
      containers:
      - name: broker
        image: summit/streaming-service:latest
        ports:
        - containerPort: 9092
          name: broker
        - containerPort: 3000
          name: api
        env:
        - name: BROKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: DATA_DIR
          value: /data
        - name: LOG_DIR
          value: /logs
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
        volumeMounts:
        - name: data
          mountPath: /data
        - name: logs
          mountPath: /logs
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
      storageClassName: fast-ssd
  - metadata:
      name: logs
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
      storageClassName: standard
```

### Service for Brokers

```yaml
# broker-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: stream-broker
  namespace: streaming-platform
spec:
  clusterIP: None
  selector:
    app: stream-broker
  ports:
  - port: 9092
    name: broker
  - port: 3000
    name: api

---
apiVersion: v1
kind: Service
metadata:
  name: stream-broker-lb
  namespace: streaming-platform
spec:
  type: LoadBalancer
  selector:
    app: stream-broker
  ports:
  - port: 9092
    targetPort: 9092
    name: broker
```

### Deployment for Correlation Service

```yaml
# correlation-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-correlation
  namespace: streaming-platform
spec:
  replicas: 5
  selector:
    matchLabels:
      app: event-correlation
  template:
    metadata:
      labels:
        app: event-correlation
    spec:
      containers:
      - name: correlation
        image: summit/event-correlation-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: BOOTSTRAP_SERVERS
          value: stream-broker-0.stream-broker:9092,stream-broker-1.stream-broker:9092,stream-broker-2.stream-broker:9092
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: event-correlation
  namespace: streaming-platform
spec:
  type: LoadBalancer
  selector:
    app: event-correlation
  ports:
  - port: 80
    targetPort: 3001
```

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: event-correlation-hpa
  namespace: streaming-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: event-correlation
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Monitoring and Observability

### Prometheus Metrics

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: streaming-platform
  namespace: streaming-platform
spec:
  selector:
    matchLabels:
      monitoring: enabled
  endpoints:
  - port: api
    path: /api/metrics
    interval: 30s
```

### Grafana Dashboards

Import the provided Grafana dashboards:

- **Broker Metrics**: `/monitoring/grafana/broker-dashboard.json`
- **CEP Metrics**: `/monitoring/grafana/cep-dashboard.json`
- **Analytics Metrics**: `/monitoring/grafana/analytics-dashboard.json`

### Alerts

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: streaming-alerts
  namespace: streaming-platform
spec:
  groups:
  - name: streaming
    interval: 30s
    rules:
    - alert: HighConsumerLag
      expr: kafka_consumergroup_lag > 10000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High consumer lag detected"

    - alert: UnderReplicatedPartitions
      expr: kafka_server_replicamanager_underreplicatedpartitions > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Under-replicated partitions detected"

    - alert: BrokerDown
      expr: up{job="stream-broker"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Broker is down"
```

## Performance Tuning

### JVM Settings (if using JVM-based components)

```bash
JAVA_OPTS="-Xms4G -Xmx8G \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=20 \
  -XX:InitiatingHeapOccupancyPercent=35 \
  -XX:G1HeapRegionSize=16M \
  -XX:MinMetaspaceFreeRatio=50 \
  -XX:MaxMetaspaceFreeRatio=80"
```

### Node.js Settings

```bash
NODE_OPTIONS="--max-old-space-size=4096 \
  --max-http-header-size=16384"
```

### OS Tuning

```bash
# File descriptor limits
ulimit -n 100000

# TCP settings
sysctl -w net.core.somaxconn=4096
sysctl -w net.ipv4.tcp_max_syn_backlog=4096
sysctl -w net.core.netdev_max_backlog=5000

# Memory settings
sysctl -w vm.swappiness=1
sysctl -w vm.dirty_ratio=80
sysctl -w vm.dirty_background_ratio=5
```

## Backup and Recovery

### Data Backup

```bash
#!/bin/bash
# backup-stream-data.sh

BACKUP_DIR="/backups/streaming"
DATA_DIR="/data"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup broker data
tar -czf "${BACKUP_DIR}/broker-data-${TIMESTAMP}.tar.gz" "${DATA_DIR}"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/broker-data-${TIMESTAMP}.tar.gz" \
  s3://summit-backups/streaming/

# Keep only last 7 days
find "${BACKUP_DIR}" -name "broker-data-*.tar.gz" -mtime +7 -delete
```

### Disaster Recovery

```bash
#!/bin/bash
# restore-stream-data.sh

BACKUP_FILE=$1
DATA_DIR="/data"

# Stop services
kubectl scale statefulset stream-broker --replicas=0 -n streaming-platform

# Restore data
tar -xzf "${BACKUP_FILE}" -C /

# Start services
kubectl scale statefulset stream-broker --replicas=3 -n streaming-platform
```

## Security

### TLS Configuration

```yaml
# tls-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: streaming-tls
  namespace: streaming-platform
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

### RBAC

```yaml
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: streaming-operator
  namespace: streaming-platform
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: streaming-operator-binding
  namespace: streaming-platform
subjects:
- kind: ServiceAccount
  name: streaming-operator
  namespace: streaming-platform
roleRef:
  kind: Role
  name: streaming-operator
  apiGroup: rbac.authorization.k8s.io
```

## Capacity Planning

### Throughput Estimation

| Component | Messages/sec | Bandwidth | CPU | Memory | Disk |
|-----------|-------------|-----------|-----|--------|------|
| Broker (3x) | 1M | 1 Gbps | 8 cores | 16 GB | 500 GB SSD |
| Correlation (5x) | 500K | 500 Mbps | 4 cores | 8 GB | 50 GB |
| Analytics (3x) | 300K | 300 Mbps | 4 cores | 8 GB | 50 GB |

### Scaling Guidelines

- **Horizontal**: Add brokers for throughput, consumers for processing
- **Vertical**: Increase memory for larger windows, CPU for higher rates
- **Partitions**: 1-2 partitions per CPU core across all consumers
- **Replication**: Factor 3 for production, 2 for staging

## Troubleshooting

### Common Issues

#### Broker Won't Start

```bash
# Check logs
kubectl logs stream-broker-0 -n streaming-platform

# Check disk space
kubectl exec stream-broker-0 -n streaming-platform -- df -h

# Verify configuration
kubectl get configmap streaming-config -n streaming-platform -o yaml
```

#### High Consumer Lag

```bash
# Check consumer group status
kubectl exec stream-broker-0 -n streaming-platform -- \
  curl localhost:3000/api/metrics | grep lag

# Scale consumers
kubectl scale deployment event-correlation --replicas=10 -n streaming-platform
```

#### Under-replicated Partitions

```bash
# Check broker health
kubectl get pods -n streaming-platform

# Check partition status
kubectl exec stream-broker-0 -n streaming-platform -- \
  curl localhost:3000/api/topics

# Trigger rebalance
kubectl exec stream-broker-0 -n streaming-platform -- \
  curl -X POST localhost:3000/api/rebalance
```

## Production Checklist

- [ ] Multi-broker cluster deployed (minimum 3)
- [ ] Replication factor ≥ 2
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Disaster recovery tested
- [ ] TLS/SSL enabled
- [ ] RBAC configured
- [ ] Resource limits set
- [ ] Auto-scaling configured
- [ ] Load testing completed
- [ ] Runbooks created
- [ ] Documentation updated

## Support

For deployment assistance:
- Slack: #streaming-platform-ops
- Email: ops@summit.io
- On-call: Use PagerDuty rotation
