# Plugin Operator Guide

## Managing Plugins

### List Plugins

```bash
# List all registered plugins
GET /api/plugins
```

### Install a Plugin

1.  Upload the plugin bundle.
2.  Register execution.

```bash
POST /api/plugins/upload
Content-Type: multipart/form-data
file=@my-plugin.tgz
```

### Enable for a Tenant

```bash
POST /api/plugins/:pluginId/enable
Content-Type: application/json
{
  "tenantId": "tenant-123",
  "config": {
    "apiKey": "..."
  }
}
```

### Inspect Health

```bash
GET /api/plugins/:pluginId/health
```

## Troubleshooting

### Plugin Failures

Check the audit logs for error details:

```sql
SELECT * FROM plugin_audit_log WHERE status = 'FAILURE' ORDER BY timestamp DESC LIMIT 10;
```

### Resource Exhaustion

If a plugin consistently hits timeout or memory limits:
1.  Check the plugin's `resources` in `plugin.json`.
2.  Review the `plugin_metrics` to see actual usage.
3.  Increase limits via policy override (if safe) or contact plugin author.
