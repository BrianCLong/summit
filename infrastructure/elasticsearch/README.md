# Elasticsearch Infrastructure

This directory contains Elasticsearch configuration and setup for the IntelGraph search platform.

## Quick Start

```bash
# Start Elasticsearch and Kibana
docker-compose up -d

# Check cluster health
curl -u elastic:changeme http://localhost:9200/_cluster/health?pretty

# Access Kibana UI
open http://localhost:5601
```

## Configuration

### Memory Settings

Elasticsearch requires adequate heap memory. The default configuration allocates 4GB:
- `-Xms4g -Xmx4g` in docker-compose.yml

Adjust based on your available resources:
- Small deployments: 2GB-4GB
- Medium deployments: 4GB-8GB
- Large deployments: 16GB-32GB

**Important**: Heap should not exceed 50% of total system RAM and should be under 32GB.

### Index Templates

Index templates in `config/index-templates/` define:
- Shard and replica configuration
- Field mappings and types
- Analyzers and tokenizers
- Search settings

Apply templates:
```bash
curl -X PUT "localhost:9200/_index_template/entities" \
  -H 'Content-Type: application/json' \
  -u elastic:changeme \
  -d @config/index-templates/entities.json
```

## Performance Tuning

### Indexing Performance

For bulk indexing operations:
```bash
# Increase refresh interval temporarily
curl -X PUT "localhost:9200/entities-*/_settings" \
  -H 'Content-Type: application/json' \
  -u elastic:changeme \
  -d '{"index": {"refresh_interval": "30s"}}'

# Disable replicas during bulk indexing
curl -X PUT "localhost:9200/entities-*/_settings" \
  -H 'Content-Type: application/json' \
  -u elastic:changeme \
  -d '{"index": {"number_of_replicas": 0}}'

# After indexing, restore settings
curl -X PUT "localhost:9200/entities-*/_settings" \
  -H 'Content-Type: application/json' \
  -u elastic:changeme \
  -d '{"index": {"refresh_interval": "1s", "number_of_replicas": 1}}'
```

### Search Performance

- Use filter context instead of query context when possible
- Utilize caching for frequently used filters
- Implement pagination with `search_after` instead of `from/size`
- Enable query result caching

## Monitoring

### Cluster Stats
```bash
curl -u elastic:changeme http://localhost:9200/_cluster/stats?pretty
```

### Index Stats
```bash
curl -u elastic:changeme http://localhost:9200/entities-*/_stats?pretty
```

### Node Stats
```bash
curl -u elastic:changeme http://localhost:9200/_nodes/stats?pretty
```

## Backup and Restore

### Create Snapshot Repository
```bash
curl -X PUT "localhost:9200/_snapshot/backup" \
  -H 'Content-Type: application/json' \
  -u elastic:changeme \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/usr/share/elasticsearch/backups"
    }
  }'
```

### Create Snapshot
```bash
curl -X PUT "localhost:9200/_snapshot/backup/snapshot_1" \
  -u elastic:changeme
```

### Restore Snapshot
```bash
curl -X POST "localhost:9200/_snapshot/backup/snapshot_1/_restore" \
  -u elastic:changeme
```

## Security

The default setup uses basic authentication with username `elastic` and password set via `ELASTIC_PASSWORD` environment variable.

For production:
1. Enable SSL/TLS
2. Use strong passwords
3. Implement role-based access control (RBAC)
4. Enable audit logging
5. Use API keys instead of basic auth

## Troubleshooting

### Out of Memory
- Increase heap size in docker-compose.yml
- Reduce field data cache size
- Limit concurrent searches

### Slow Queries
- Use the `_search` API with `profile: true` to analyze query performance
- Check for heavy aggregations
- Review field mappings and analyzers

### High CPU Usage
- Review thread pool settings
- Check for expensive queries
- Monitor shard allocation

## Production Checklist

- [ ] Configure appropriate heap size
- [ ] Set up multi-node cluster
- [ ] Enable SSL/TLS
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerting
- [ ] Implement index lifecycle management (ILM)
- [ ] Configure proper shard allocation
- [ ] Set up cross-cluster replication (if needed)
- [ ] Tune JVM garbage collection
- [ ] Configure proper file descriptors and memory limits
