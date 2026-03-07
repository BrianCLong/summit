# SIEM Integration Guide

Summit generates structured JSON logs that can be easily ingested by SIEM platforms like Splunk, Elastic, or Datadog.

## Log Format

Summit emits logs in JSON format (ECS-compatible) to stdout/stderr.

```json
{
  "level": "info",
  "time": "2024-05-20T10:00:00.000Z",
  "pid": 1,
  "hostname": "summit-api-6b8f7d9c-abcde",
  "msg": "User login successful",
  "user_id": "user_123",
  "tenant_id": "tenant_456",
  "source_ip": "192.168.1.50",
  "action": "auth.login",
  "outcome": "success"
}
```

## Splunk Integration

### Option 1: Splunk Connect for Kubernetes (SCK)

1.  Deploy SCK to your cluster.
2.  Configure SCK to collect logs from the `summit` namespace.
3.  Logs will appear in your configured Splunk index.

### Option 2: HTTP Event Collector (HEC) via Fluentd/Filebeat

See `infra/filebeat/` for a sample Filebeat configuration.

1.  Configure Filebeat to harvest container logs.
2.  Set the output to your Splunk HEC endpoint.

## Elastic Stack (ELK) Integration

1.  Deploy Filebeat as a DaemonSet.
2.  Configure Filebeat with the `docker` input and `elasticsearch` or `logstash` output.
3.  Import the Summit dashboard (JSON) into Kibana (contact support for the dashboard pack).

## Security Events

Filter for the following `action` fields for security monitoring:

- `auth.login.failure`
- `auth.token.revoke`
- `admin.config.change`
- `data.export`
