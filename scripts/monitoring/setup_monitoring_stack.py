# Summit Application - Monitoring Dashboard Configuration
# Complete monitoring and observability setup

import os
import json
import yaml
from datetime import datetime

def create_monitoring_dashboard():
    """Create comprehensive monitoring dashboard configuration"""
    print("📊 Creating comprehensive monitoring dashboard...")
    
    # Create Prometheus configuration
    prometheus_config = {
        "global": {
            "scrape_interval": "15s",
            "evaluation_interval": "15s"
        },
        "rule_files": [
            "alert_rules.yml"
        ],
        "scrape_configs": [
            {
                "job_name": "summit-api",
                "static_configs": [
                    {
                        "targets": ["localhost:4000"],
                        "labels": {
                            "service": "summit-api",
                            "environment": "production"
                        }
                    }
                ],
                "scrape_interval": "5s"
            },
            {
                "job_name": "summit-web",
                "static_configs": [
                    {
                        "targets": ["localhost:3000"],
                        "labels": {
                            "service": "summit-web",
                            "environment": "production"
                        }
                    }
                ],
                "scrape_interval": "5s"
            },
            {
                "job_name": "neo4j",
                "static_configs": [
                    {
                        "targets": ["localhost:7474"],
                        "labels": {
                            "service": "neo4j",
                            "environment": "production"
                        }
                    }
                ],
                "scrape_interval": "10s"
            },
            {
                "job_name": "postgres",
                "static_configs": [
                    {
                        "targets": ["localhost:5432"],
                        "labels": {
                            "service": "postgres",
                            "environment": "production"
                        }
                    }
                ],
                "scrape_interval": "10s"
            },
            {
                "job_name": "redis",
                "static_configs": [
                    {
                        "targets": ["localhost:6379"],
                        "labels": {
                            "service": "redis",
                            "environment": "production"
                        }
                    }
                ],
                "scrape_interval": "10s"
            }
        ]
    }
    
    with open('prometheus.yml', 'w') as f:
        yaml.dump(prometheus_config, f, default_flow_style=False)
    
    print("✅ Created prometheus.yml configuration")
    
    # Create alert rules
    alert_rules = {
        "groups": [
            {
                "name": "summit-alerts",
                "rules": [
                    {
                        "alert": "SummitAPIDown",
                        "expr": "up{job=\"summit-api\"} == 0",
                        "for": "5m",
                        "labels": {
                            "severity": "critical"
                        },
                        "annotations": {
                            "summary": "Summit API is down",
                            "description": "Summit API has been down for more than 5 minutes"
                        }
                    },
                    {
                        "alert": "HighErrorRate",
                        "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) > 0.1",
                        "for": "2m",
                        "labels": {
                            "severity": "warning"
                        },
                        "annotations": {
                            "summary": "High error rate detected",
                            "description": "HTTP error rate is above 10% for more than 2 minutes"
                        }
                    },
                    {
                        "alert": "HighResponseTime",
                        "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2",
                        "for": "5m",
                        "labels": {
                            "severity": "warning"
                        },
                        "annotations": {
                            "summary": "High response time detected",
                            "description": "95th percentile response time is above 2 seconds"
                        }
                    },
                    {
                        "alert": "HighCPUUsage",
                        "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100) > 80",
                        "for": "5m",
                        "labels": {
                            "severity": "warning"
                        },
                        "annotations": {
                            "summary": "High CPU usage detected",
                            "description": "CPU usage is above 80% for more than 5 minutes"
                        }
                    },
                    {
                        "alert": "HighMemoryUsage",
                        "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85",
                        "for": "5m",
                        "labels": {
                            "severity": "warning"
                        },
                        "annotations": {
                            "summary": "High memory usage detected",
                            "description": "Memory usage is above 85% for more than 5 minutes"
                        }
                    }
                ]
            }
        ]
    }
    
    with open('alert_rules.yml', 'w') as f:
        yaml.dump(alert_rules, f, default_flow_style=False)
    
    print("✅ Created alert_rules.yml")
    
    # Create Grafana dashboard configuration
    grafana_dashboard = {
        "dashboard": {
            "id": None,
            "title": "Summit Application Dashboard",
            "tags": ["summit", "ai", "analytics", "intelgraph"],
            "style": "dark",
            "timezone": "utc",
            "panels": [
                {
                    "id": 1,
                    "title": "API Health Overview",
                    "type": "stat",
                    "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
                    "targets": [
                        {
                            "expr": "up{job=\"summit-api\"}",
                            "legendFormat": "API Status"
                        }
                    ],
                    "fieldConfig": {
                        "defaults": {
                            "color": {
                                "mode": "thresholds"
                            },
                            "thresholds": {
                                "steps": [
                                    {"color": "red", "value": None},
                                    {"color": "green", "value": 1}
                                ]
                            }
                        }
                    }
                },
                {
                    "id": 2,
                    "title": "HTTP Request Rate",
                    "type": "graph",
                    "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
                    "targets": [
                        {
                            "expr": "rate(http_requests_total[5m])",
                            "legendFormat": "{{method}} {{handler}}"
                        }
                    ]
                },
                {
                    "id": 3,
                    "title": "Response Time (95th Percentile)",
                    "type": "graph",
                    "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
                    "targets": [
                        {
                            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
                            "legendFormat": "{{handler}}"
                        }
                    ]
                },
                {
                    "id": 4,
                    "title": "Error Rate",
                    "type": "graph",
                    "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
                    "targets": [
                        {
                            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
                            "legendFormat": "Errors"
                        }
                    ]
                },
                {
                    "id": 5,
                    "title": "Database Connections",
                    "type": "timeseries",
                    "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16},
                    "targets": [
                        {
                            "expr": "sum by(database) (pg_stat_activity_count)",
                            "legendFormat": "{{database}}"
                        }
                    ]
                },
                {
                    "id": 6,
                    "title": "Redis Memory Usage",
                    "type": "timeseries",
                    "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16},
                    "targets": [
                        {
                            "expr": "redis_memory_used_bytes / redis_memory_max_bytes * 100",
                            "legendFormat": "Memory Usage %"
                        }
                    ]
                },
                {
                    "id": 7,
                    "title": "Active Users",
                    "type": "stat",
                    "gridPos": {"h": 8, "w": 6, "x": 0, "y": 24},
                    "targets": [
                        {
                            "expr": "sum(summit_active_users)",
                            "legendFormat": "Active Users"
                        }
                    ]
                },
                {
                    "id": 8,
                    "title": "Security Events",
                    "type": "timeseries",
                    "gridPos": {"h": 8, "w": 6, "x": 6, "y": 24},
                    "targets": [
                        {
                            "expr": "rate(summit_security_events_total[5m])",
                            "legendFormat": "{{type}}"
                        }
                    ]
                },
                {
                    "id": 9,
                    "title": "LUSPO Performance Metrics",
                    "type": "timeseries",
                    "gridPos": {"h": 8, "w": 12, "x": 12, "y": 24},
                    "targets": [
                        {
                            "expr": "summit_luspo_length_drift_ratio",
                            "legendFormat": "Length Drift Ratio"
                        },
                        {
                            "expr": "summit_luspo_bias_score",
                            "legendFormat": "Bias Score"
                        }
                    ]
                }
            ],
            "time": {
                "from": "now-6h",
                "to": "now"
            },
            "refresh": "5s"
        },
        "folder": "Summit Application",
        "overwrite": True
    }
    
    with open('grafana-dashboard.json', 'w') as f:
        json.dump(grafana_dashboard, f, indent=2)
    
    print("✅ Created grafana-dashboard.json")
    
    # Create OpenTelemetry configuration
    otel_config = {
        "receivers": {
            "otlp": {
                "protocols": {
                    "grpc": {
                        "endpoint": "0.0.0.0:4317"
                    },
                    "http": {
                        "endpoint": "0.0.0.0:4318"
                    }
                }
            },
            "prometheus": {
                "config": {
                    "global": {
                        "scrape_interval": "15s"
                    },
                    "scrape_configs": [
                        {
                            "job_name": "summit-app",
                            "static_configs": [
                                {
                                    "targets": ["localhost:4000"]
                                }
                            ]
                        }
                    ]
                }
            }
        },
        "processors": {
            "batch": {
                "timeout": "1s"
            },
            "attributes": {
                "actions": [
                    {
                        "key": "env",
                        "value": "production",
                        "action": "upsert"
                    }
                ]
            }
        },
        "exporters": {
            "otlp": {
                "endpoint": "jaeger:4317",
                "tls": {
                    "insecure": True
                }
            },
            "prometheus": {
                "endpoint": ":8889"
            }
        },
        "service": {
            "pipelines": {
                "traces": {
                    "receivers": ["otlp"],
                    "processors": ["batch", "attributes"],
                    "exporters": ["otlp"]
                },
                "metrics": {
                    "receivers": ["otlp", "prometheus"],
                    "processors": ["batch", "attributes"],
                    "exporters": ["prometheus"]
                },
                "logs": {
                    "receivers": ["otlp"],
                    "processors": ["batch", "attributes"],
                    "exporters": ["otlp"]
                }
            }
        }
    }
    
    with open('otel-collector-config.yaml', 'w') as f:
        yaml.dump(otel_config, f, default_flow_style=False)
    
    print("✅ Created otel-collector-config.yaml")
    
    # Create monitoring runbook
    monitoring_runbook = """
# Summit Application Monitoring Runbook

## Overview
This runbook provides guidance for monitoring the Summit application and responding to common issues.

## Key Metrics to Monitor

### Application Health
- `up{job="summit-api"}` - API service availability
- `http_requests_total` - Request volume and error rates
- `http_request_duration_seconds` - Response time percentiles
- `summit_active_users` - Active user count

### Database Health
- `pg_up` - PostgreSQL connectivity
- `pg_stat_activity_count` - Active connections
- `neo4j_database_status` - Neo4j database status
- `redis_connected_clients` - Redis client connections

### System Resources
- `node_cpu_seconds_total` - CPU usage
- `node_memory_MemAvailable_bytes` - Available memory
- `node_disk_space_available_bytes` - Available disk space
- `node_network_receive_bytes_total` - Network I/O

### Security Metrics
- `summit_security_events_total` - Security events
- `summit_auth_failures_total` - Authentication failures
- `summit_rate_limit_exceeded_total` - Rate limit violations

## Alert Definitions

### Critical Alerts
- **SummitAPIDown**: API service is unavailable
- **DatabaseDown**: Database connectivity lost
- **HighErrorRate**: Error rate exceeds 10%
- **SecurityBreach**: Potential security incident detected

### Warning Alerts
- **HighResponseTime**: 95th percentile response time > 2s
- **HighCPUUsage**: CPU usage > 80%
- **HighMemoryUsage**: Memory usage > 85%
- **HighDiskUsage**: Disk usage > 90%

## Response Procedures

### Summit API Down
1. Check service logs: `kubectl logs deployment/summit-api`
2. Verify dependencies (database, cache) are available
3. Restart service if necessary: `kubectl rollout restart deployment/summit-api`
4. Monitor for recovery: `kubectl get pods`

### High Error Rate
1. Check application logs for error patterns
2. Verify recent deployments or configuration changes
3. Check database connectivity and performance
4. Review security logs for potential attacks

### High Response Time
1. Check for resource constraints (CPU, memory)
2. Review database query performance
3. Check for external service dependencies
4. Analyze application profiling data

### Security Incident
1. Isolate affected systems if necessary
2. Review security logs and audit trails
3. Notify security team immediately
4. Follow incident response procedures

## Dashboards

### Main Dashboard
- URL: http://grafana:3000/d/summit-main
- Shows overall application health and key metrics

### Database Dashboard
- URL: http://grafana:3000/d/summit-db
- Shows database performance and health

### Security Dashboard
- URL: http://grafana:3000/d/summit-security
- Shows security metrics and events

## Tools

### Health Check
```bash
curl http://localhost:4000/health
```

### Metrics Endpoint
```bash
curl http://localhost:4000/metrics
```

### Tracing
- Jaeger UI: http://jaeger:16686
- Search for traces by service name or operation

## Escalation

- **Tier 1**: Application logs and basic metrics
- **Tier 2**: Database and infrastructure metrics
- **Tier 3**: Security and compliance issues

## Contact Information
- On-call engineer: [on-call-tool]
- Security team: security@summit-app.org
- DevOps team: devops@summit-app.org
"""
    
    with open('MONITORING_RUNBOOK.md', 'w') as f:
        f.write(monitoring_runbook)
    
    print("✅ Created MONITORING_RUNBOOK.md")
    
    return True

def create_log_aggregation_config():
    """Create log aggregation and analysis configuration"""
    print("🔍 Creating log aggregation configuration...")
    
    # Create FluentBit configuration for log aggregation
    fluentbit_config = """
[SERVICE]
    Flush         1
    Log_Level     info
    Daemon        off
    Parsers_File  parsers.conf
    HTTP_Server   On
    HTTP_Listen   0.0.0.0
    HTTP_Port     2020

[INPUT]
    Name              tail
    Path              /var/log/summit/*.log
    Parser            json
    Tag               summit.app
    Refresh_Interval  5

[INPUT]
    Name              systemd
    Tag               summit.systemd
    Systemd_Filter    _SYSTEMD_UNIT=summit.service
    Path              /var/log/journal

[FILTER]
    Name                parser
    Match               summit.*
    Key_Name            log
    Parser              json
    Reserve_Data        On

[OUTPUT]
    Name            es
    Match           *
    Host            elasticsearch
    Port            9200
    Index           summit-logs
    Type            _doc
    Retry_Limit     False

[OUTPUT]
    Name            stdout
    Match           *
    Format          json
"""
    
    with open('fluent-bit.conf', 'w') as f:
        f.write(fluentbit_config)
    
    print("✅ Created fluent-bit.conf for log aggregation")
    
    # Create log parsing configuration
    log_parsing_config = """
[PARSER]
    Name        summit_json
    Format      json
    Time_Key    timestamp
    Time_Format %Y-%m-%dT%H:%M:%S.%LZ
    Time_Keep   On

[PARSER]
    Name        summit_access
    Format      regex
    Regex       ^(?<remote_addr>[^ ]*) - (?<remote_user>[^ ]*) \[(?<time_local>[^\]]*)\] "(?<method>\S+)(?: +(?<request>[^\"]*?)(?: +(?<http_version>[^"]*?))?)?" (?<status>[^ ]*) (?<body_bytes_sent>[^ ]*)(?: "(?<http_referer>[^\"]*)" "(?<http_user_agent>[^\"]*)")?$
    Time_Key    time_local
    Time_Format %d/%b/%Y:%H:%M:%S %z
"""
    
    with open('parsers.conf', 'w') as f:
        f.write(log_parsing_config)
    
    print("✅ Created parsers.conf for log parsing")
    
    return True

def create_performance_benchmarking():
    """Create performance benchmarking configuration"""
    print("⚡ Creating performance benchmarking configuration...")
    
    # Create benchmarking configuration
    benchmark_config = {
        "benchmark_suite": "summit_performance_benchmarks",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "tests": [
            {
                "name": "api_response_time",
                "description": "Measure API response times under various loads",
                "parameters": {
                    "concurrent_users": [10, 50, 100, 200],
                    "test_duration": "60s",
                    "target_endpoint": "/api/graphql",
                    "request_payload": {
                        "query": "{ health { status version } }"
                    }
                },
                "metrics": [
                    "p50_response_time",
                    "p95_response_time", 
                    "p99_response_time",
                    "requests_per_second",
                    "error_rate"
                ]
            },
            {
                "name": "luspo_algorithm_performance",
                "description": "Benchmark LUSPO algorithm performance",
                "parameters": {
                    "dataset_sizes": [100, 1000, 5000, 10000],
                    "response_lengths": [50, 100, 200, 500],
                    "iterations": 100
                },
                "metrics": [
                    "algorithm_execution_time",
                    "memory_usage",
                    "length_drift_detection_accuracy"
                ]
            },
            {
                "name": "cadds_connector_throughput",
                "description": "Test DIU CADDS connector throughput",
                "parameters": {
                    "request_batch_sizes": [10, 50, 100],
                    "error_rates": [0, 0.05, 0.1, 0.2],
                    "malformed_data_rates": [0, 0.01, 0.05]
                },
                "metrics": [
                    "requests_per_second",
                    "error_handling_time",
                    "successful_processing_rate"
                ]
            },
            {
                "name": "knowledge_graph_queries",
                "description": "Benchmark knowledge graph query performance",
                "parameters": {
                    "query_complexity": ["simple", "moderate", "complex"],
                    "graph_sizes": [1000, 5000, 10000, 50000],
                    "concurrent_queries": [1, 5, 10, 20]
                },
                "metrics": [
                    "query_execution_time",
                    "memory_usage",
                    "result_accuracy"
                ]
            }
        ],
        "reporting": {
            "output_format": "json",
            "output_path": "reports/benchmarks/",
            "grafana_dashboard": "summit-performance",
            "alert_thresholds": {
                "api_response_time_p95": "2s",
                "luspo_algorithm_execution": "100ms",
                "cadds_connector_throughput": "100 req/s"
            }
        }
    }
    
    with open('benchmark-config.json', 'w') as f:
        json.dump(benchmark_config, f, indent=2)
    
    print("✅ Created benchmark-config.json")
    
    # Create benchmarking script
    benchmark_script = '''#!/bin/bash
# Summit Application Performance Benchmarking Script

set -e

echo "⚡ Running Summit application performance benchmarks..."

# Function to run API response time benchmark
run_api_benchmark() {
    echo "Running API response time benchmark..."
    
    # Use Apache Bench for load testing
    if command -v ab &> /dev/null; then
        echo "Using Apache Bench for API benchmarking..."
        ab -n 1000 -c 10 -T application/json -p api-payload.json http://localhost:4000/api/graphql
    elif command -v wrk &> /dev/null; then
        echo "Using wrk for API benchmarking..."
        wrk -t12 -c400 -d30s -s api-benchmark.lua http://localhost:4000/api/graphql
    else
        echo "No benchmarking tool found (install apache2-utils or wrk)"
        return 1
    fi
}

# Function to run LUSPO algorithm benchmark
run_luspo_benchmark() {
    echo "Running LUSPO algorithm benchmark..."
    
    # Run the LUSPO performance tests
    python3 -m pytest tests/rlvr/test_performance_benchmarks.py -v
}

# Function to run CADDS connector benchmark
run_cadds_benchmark() {
    echo "Running CADDS connector benchmark..."
    
    # Run the CADDS performance tests
    python3 -m pytest tests/connectors/test_cadds_performance.py -v
}

# Function to run knowledge graph benchmark
run_kg_benchmark() {
    echo "Running knowledge graph benchmark..."
    
    # Run the knowledge graph performance tests
    python3 -m pytest tests/kg/test_performance_benchmarks.py -v
}

# Main execution
echo "Starting Summit performance benchmarking suite..."
echo "Timestamp: $(date -Iseconds)"

# Create API payload for benchmarking
cat > api-payload.json << EOF
{
  "query": "{ health { status version } }"
}
EOF

# Run all benchmarks
run_api_benchmark
run_luspo_benchmark
run_cadds_benchmark
run_kg_benchmark

echo "Performance benchmarking complete!"
echo "Results saved to reports/benchmarks/"
'''
    
    with open('run-benchmarks.sh', 'w') as f:
        f.write(benchmark_script)
    
    # Make it executable
    os.chmod('run-benchmarks.sh', 0o755)
    
    print("✅ Created run-benchmarks.sh")
    
    return True

def create_security_monitoring():
    """Create security monitoring configuration"""
    print("🛡️ Creating security monitoring configuration...")
    
    # Create Falco rules for runtime security monitoring
    falco_rules = """
# Summit Application Security Rules
# Runtime security monitoring for Summit application

- rule: Summit App Modified
  desc: Detect changes to Summit application files
  condition: >
    evt.type=chmod and container
    and fd.name startswith /app/summit
    and not proc.name in (cp, mv, ln, ln-s, mkdir, touch, rm, rmdir)
  output: >
    Summit application file modified (user=%user.name command=%proc.cmdline file=%fd.name)
  priority: CRITICAL
  tags: [summit, filesystem]

- rule: Summit App Network Connection
  desc: Detect unexpected network connections from Summit app
  condition: >
    evt.type in (connect, accept) and container
    and container.image.repository = summit-app
    and fd.ip != "127.0.0.1" and fd.net != "10.0.0.0/8"
    and not fd.sport in (80, 443, 5432, 6379, 7687)
  output: >
    Unexpected network connection from Summit app (command=%proc.cmdline connection=%fd.cip:%fd.sport)
  priority: WARNING
  tags: [summit, network]

- rule: Summit App Spawn Process
  desc: Detect unexpected process spawning in Summit app
  condition: >
    spawned_process and container
    and container.image.repository = summit-app
    and not proc.name in (sh, bash, node, python, python3)
  output: >
    Unexpected process spawned in Summit app (command=%proc.cmdline)
  priority: CRITICAL
  tags: [summit, process]

- rule: Summit App Read Sensitive File
  desc: Detect Summit app reading sensitive files
  condition: >
    open_read and container
    and container.image.repository = summit-app
    and fd.name in (/etc/shadow, /etc/passwd, /etc/group, /etc/hosts, /etc/hostname)
  output: >
    Summit app reading sensitive file (user=%user.name command=%proc.cmdline file=%fd.name)
  priority: WARNING
  tags: [summit, filesystem]

- rule: Summit App Write to Binary Dir
  desc: Detect Summit app writing to binary directories
  condition: >
    open_write and container
    and container.image.repository = summit-app
    and fd.directory in (/bin, /sbin, /usr/bin, /usr/sbin, /usr/local/bin, /usr/local/sbin)
  output: >
    Summit app writing to binary directory (user=%user.name command=%proc.cmdline file=%fd.name)
  priority: CRITICAL
  tags: [summit, filesystem]
"""
    
    with open('falco-summit-rules.yaml', 'w') as f:
        f.write(falco_rules)
    
    print("✅ Created falco-summit-rules.yaml")
    
    # Create security monitoring dashboard
    security_dashboard = {
        "dashboard": {
            "title": "Summit Application Security Dashboard",
            "tags": ["summit", "security", "compliance"],
            "panels": [
                {
                    "title": "Security Events Over Time",
                    "type": "graph",
                    "targets": [
                        {
                            "expr": "rate(summit_security_events_total[5m])",
                            "legendFormat": "{{type}}"
                        }
                    ]
                },
                {
                    "title": "Authentication Failures",
                    "type": "graph",
                    "targets": [
                        {
                            "expr": "rate(summit_auth_failures_total[5m])",
                            "legendFormat": "{{source}}"
                        }
                    ]
                },
                {
                    "title": "Rate Limit Violations",
                    "type": "graph",
                    "targets": [
                        {
                            "expr": "rate(summit_rate_limit_exceeded_total[5m])",
                            "legendFormat": "{{endpoint}}"
                        }
                    ]
                },
                {
                    "title": "PII Redaction Events",
                    "type": "graph",
                    "targets": [
                        {
                            "expr": "rate(summit_pii_redaction_events_total[5m])",
                            "legendFormat": "{{type}}"
                        }
                    ]
                },
                {
                    "title": "Evidence Chain Integrity",
                    "type": "stat",
                    "targets": [
                        {
                            "expr": "summit_evidence_chain_integrity_status",
                            "legendFormat": "Integrity Status"
                        }
                    ]
                }
            ]
        }
    }
    
    with open('security-dashboard.json', 'w') as f:
        json.dump(security_dashboard, f, indent=2)
    
    print("✅ Created security-dashboard.json")
    
    return True

def run_complete_monitoring_setup():
    """Run complete monitoring setup"""
    print("🚀 Running complete monitoring setup for Summit application...")
    print("=" * 65)
    
    results = []
    results.append(create_monitoring_dashboard())
    results.append(create_log_aggregation_config())
    results.append(create_performance_benchmarking())
    results.append(create_security_monitoring())
    
    print("\n" + "=" * 65)
    successful_setups = sum(1 for r in results if r is not False)
    total_setups = len([r for r in results if r is not None])
    
    print(f"Monitoring Setup Summary: {successful_setups}/{total_setups} completed")
    
    if successful_setups == total_setups and total_setups > 0:
        print("✅ All monitoring components successfully created!")
        print("The Summit application now has comprehensive monitoring and observability.")
    elif total_setups > 0:
        print(f"⚠️ {total_setups - successful_setups} monitoring components had issues")
    else:
        print("⚠️ No monitoring components could be created")
    
    print("\nThe monitoring setup includes:")
    print("- Prometheus configuration for metrics collection")
    print("- Alert rules for critical issues")
    print("- Grafana dashboard for visualization")
    print("- OpenTelemetry collector configuration")
    print("- Log aggregation with FluentBit")
    print("- Performance benchmarking suite")
    print("- Security monitoring with Falco rules")
    print("- Security dashboard for threat detection")
    
    return successful_setups, total_setups

if __name__ == "__main__":
    run_complete_monitoring_setup()