# Evidence ID Consistency Gate - Operator Runbook

## Service Overview
- **Name**: Evidence ID Consistency Gate
- **Purpose**: Validate Evidence-IDs in governance documents against evidence registry
- **Component**: Part of Governance Verification Suite v1.3.0+ 
- **Uptime SLA**: 99.9% (Integrated into critical CI/CD paths)
- **Contact**: #governance-team (primary), #platform-eng (secondary)

## Critical Operating Metrics

### Key Performance Indicators
- **Gate execution time**: <100ms (p95), <1s (p99) for typical repos
- **Cache hit rate**: >95% in CI environments  
- **False positive rate**: <5% (if higher, investigate policy evolution)
- **Orphaned ID discovery rate**: Baseline established per repo

### Monitoring Queries
Prometheus metrics (when instrumented):
```
# Execution time
histogram_quantile(0.95, sum(rate(evidence_id_gate_duration_seconds_bucket[5m])) by (le))

# Cache effectiveness
sum(rate(evidence_id_gate_cache_hits_total[5m])) / 
sum(rate(evidence_id_gate_cache_requests_total[5m]))

# Error rates  
sum(rate(evidence_id_gate_errors_total[5m]))
```

### Alert Conditions
- `Gate execution time > 5s for >5m` - Performance degradation
- `Cache hit rate < 80% for >10m` - Potential network issues or AI service problems
- `Error rate > 1% for >5m` - System health degradation

## Incident Response

### High Severity Incidents (P0 - Service Down)
**Symptoms**: 
- CI/CD pipelines failing with evidence gate errors
- Gate not responding to requests
- Consistent execution failures across multiple repos

**Immediate Actions**:
1. **Check if environment variables are set**: `DASHSCOPE_API_KEY`, `QWEN_BASE_URL` (if using AI)
2. **Verify file existence**: Check `evidence/map.yml` exists
3. **Check permissions**: Ensure read access to governance documents
4. **Disable AI temporarily**: Set `ENABLE_QWEN_ANALYSIS=false` and test

**Rollback**: Remove from CI or disable with env vars, contact governance team

### Medium Severity Incidents (P1 - Degraded Functionality)
**Symptoms**:
- Gate running but with unexpected violations
- AI analysis returning inconsistent results
- Cache miss rate suddenly spiking

**Immediate Actions**:
1. **Check for content drift**: Compare recent changes in governance docs
2. **Verify evidence registry**: Check `evidence/map.yml` for missing entries
3. **Check AI provider status**: Verify DashScope service availability
4. **Clear cache if needed**: Remove `.qwen-cache/` directory if corruption suspected

### Low Severity Incidents (P2 - Minor Issues)
**Symptoms**:
- New warnings that weren't expected
- Performance slightly degraded (still <500ms)
- Temporary network issues with AI provider

**Actions**:
- Monitor for trend to P1/P0
- Update documentation if new expected behaviors emerge
- Refresh cache during maintenance window if needed

## Common Operations

### Routine Maintenance

#### Cache Management
**Frequency**: Weekly
```bash
# Check cache size
du -sh .qwen-cache/

# Rotate old cache entries (daily basis)
find .qwen-cache/ -name "*.json" -mtime +7 -delete

# Warm cache for new AI models (if using AI features)
ENABLE_QWEN_ANALYSIS=true ALLOW_QWEN_RECORD_IN_CI=true npm run ci:evidence-id-consistency
```

#### Evidence Registry Cleanup
**Frequency**: Monthly
- Review orphaned evidence IDs identified by gate
- Remove unused evidence registry entries
- Update governance documents with new evidence references

#### Performance Monitoring
**Daily**: Check execution times and cache hit rates
**Weekly**: Review false positive rates and adjust policies if needed
**Monthly**: Analyze usage trends and capacity planning

### Configuration Changes

#### Adding New Evidence IDs
1. Update `evidence/map.yml` with new entry
2. Add reference to appropriate governance documents
3. Run gate to verify consistency
4. Update related runbooks/documentation

#### Changing AI Models
1. Update `QWEN_MODEL` environment variable
2. Temporarily allow recording: `ALLOW_QWEN_RECORD_IN_CI=true`
3. Run gate to populate new model responses in cache
4. Verify results quality
5. Return to replay-only: `ALLOW_QWEN_RECORD_IN_CI=false`

#### Adjusting Sensitivity
- **Reduce false positives**: Lower severity thresholds in policy file
- **Increase strictness**: Enable stricter validation in `EVIDENCE_ID_POLICY.yml`
- **Custom rules**: Add specialized validation logic to gate script

## Troubleshooting Decision Tree

### Gate Fails in CI
1. **Check file permissions**: Ensure read access to governance docs
2. **Verify SHA**: Check git commit SHA validity
3. **Check evidence registry**: Confirm `evidence/map.yml` exists and valid
4. **Disable AI temporarily**: Set `ENABLE_QWEN_ANALYSIS=false`
5. **Fallback to manual**: Run locally to isolate CI-specific issues

### Gate Runs Slowly
1. **Check repo size**: Count governance documents
2. **Verify cache**: Check `.qwen-cache/` exists and readable
3. **Check hardware**: Monitor CPU/memory during execution
4. **Parallelism**: Adjust `MAX_CONCURRENT_FILES` if needed  
5. **AI provider**: If using AI, check network latency to DashScope

### Unexpected Violations
1. **Compare with previous runs**: Check recent changes to docs/registry
2. **Validate format**: Check Evidence-ID format compliance
3. **Check for typos**: Compare registry spelling vs. document references
4. **Review policy**: Check `EVIDENCE_ID_POLICY.yml` for changes

## Recovery Procedures

### Service Restoration
If the gate becomes unavailable:
1. **Immediate**: Set `ENABLE_QWEN_ANALYSIS=false` to disable AI features
2. **Short-term**: Bypass gate entirely (remove from CI temporarily)
3. **Long-term**: Fix underlying issue and re-enable

### Data Recovery
If evidence registry becomes corrupted:
1. **Restore from backup**: Use Git to revert to last known good state
2. **Rebuild from templates**: Use evidence template to reconstruct
3. **Validate consistency**: Run gate to verify restored registry

### Cache Recovery
If cache becomes corrupted:
1. **Clear cache**: Remove `.qwen-cache/` directory
2. **Warm cache**: Run gate in record mode to repopulate (use cautiously)
3. **Monitor**: Verify cache performance returns to normal

## Backup and Restore

### Backup Schedule
- **Evidence registry**: Git-based (every commit)
- **Cache**: Not backed up (ephemeral, rebuildable)
- **Configuration**: Git-based with rest of codebase

### Restore Process
- **Registry**: `git checkout HEAD~n -- evidence/map.yml`
- **Policy**: `git checkout HEAD~n -- docs/governance/EVIDENCE_ID_POLICY.yml`
- **Scripts**: `git checkout HEAD~n -- scripts/ci/verify_evidence_id_consistency.mjs`

## Escalation Matrix

| Condition | Level | Who to Contact | How to Reach |
|-----------|-------|----------------|--------------|  
| Gate completely down | P0 | On-call Engineer | PagerDuty / Slack @here |
| Gate returning unexpected results | P1 | Governance Team | #governance-team Slack |
| Question about usage | P3 | Documentation | Refer to this runbook |

### Out-of-Hours Escalation
- **Weekdays 0600-1800 PST**: Primary team via Slack
- **After hours / Weekends**: On-call engineer via PagerDuty
- **Major outage**: Escalate to Tech Lead via emergency contact

## Communication Templates

### Incident Notification
```
[INCIDENT] Evidence ID Consistency Gate - [SEVERITY LEVEL]

Summary: [Brief description of impact]
Status: Investigating/Fixed/In Progress
Impact: [Affected repos/systems]
Start Time: [Timestamp]
Assignee: [Name]

Links:
- CI Status: [Link to affected pipelines]
- Logs: [Link to relevant logs]
- Runbook: [Link to this runbook]
```

### Resolution Communication
```
[RESOLVED] Evidence ID Consistency Gate

Issue: [Brief description of root cause]
Resolution: [How it was fixed]
Prevention: [What's being done to prevent recurrence]

Timeline:
- Detected: [Time]
- Root Cause Identified: [Time]  
- Resolved: [Time]
```

### Maintenance Window Notice
```
Scheduled Maintenance: Evidence ID Consistency Gate
Date: [Date]
Time: [Time window]
Duration: [Estimated time]
Impact: [Expected impact]

Work being performed:
- [Maintenance tasks]
- [Any temporary changes to configuration]

Rollback plan: [How to revert if needed]
```

## Appendix A: Environment Variables

| Variable | Default | Purpose | Required |
|----------|---------|---------|----------|
| `ENABLE_QWEN_ANALYSIS` | `false` | Enable AI-assisted analysis | No |
| `ENABLE_QWEN_PATCHES` | `false` | Enable AI patch generation | No |
| `DASHSCOPE_API_KEY` | - | Qwen API key | When AI enabled |
| `QWEN_MODEL` | `qwen-plus-2025-01-25` | Model to use for AI | When AI enabled |
| `QWEN_BASE_URL` | International endpoint | Qwen service URL | When AI enabled |
| `QWEN_CACHE_DIR` | `.qwen-cache` | Cache directory | No |
| `QWEN_CACHE_ENABLED` | `true` | Enable caching | No |
| `QWEN_PATCHES_FAIL_ON_HIGH` | `false` | Fail build on high severity patches | No |
| `MAX_CONCURRENT_FILES` | `10` | Concurrent file processing | No |
| `MAX_FILE_SIZE_BYTES` | `10485760` (10MB) | Max file size | No |

## Appendix B: Exit Codes

- `0`: Success, no errors found
- `1`: Failures found, gate did not pass
- `2`: Gate configuration error
- `3`: File access or permissions error
- `4`: Evidence registry validation error

For additional support, contact the governance team or reference the integration guide.