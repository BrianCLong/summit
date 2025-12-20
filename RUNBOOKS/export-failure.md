# Export Failure - Runbook

For incidents where scheduled or ad-hoc exports fail or deliver incomplete data.

## Detection

- [ ] Alert: Export job failure rate >2% over 10 minutes.
- [ ] Alert: Export latency >2× SLO or stuck in `running` state beyond SLA.
- [ ] Customer reports incomplete files or checksum mismatches.

## Immediate Actions (10 minutes)

- [ ] Declare incident; assign comms lead.
- [ ] Pause new bulk exports to reduce load.
- [ ] Capture failing job IDs and sample logs.

## Diagnostics

1. **Job state**
   - Command: `exportctl list --status failed --limit 20`
   - Expected: Error reasons visible; categorize by connector/storage.
2. **Storage health**
   - Command: `aws s3api head-bucket --bucket $EXPORT_BUCKET`
   - Expected: 200 OK. If throttled, note error code and region.
3. **Checksum verification**
   - Command: `exportctl verify --job <job-id>`
   - Expected: Checksums match; if mismatch, identify missing segments.
4. **Network path**
   - Command: `mtr -r $EXPORT_TARGET_HOST`
   - Expected: No packet loss or high latency spikes.

## Mitigations

- [ ] Retry failed jobs with safe concurrency:
  - Command: `exportctl retry --status failed --limit 20 --concurrency 2`
  - Expected: Jobs move to `running`; monitor for repeat errors.
- [ ] Redirect exports to secondary bucket (if primary impaired):
  - Command: `featurectl set export.fallback_bucket <bucket> --ttl 30m`
  - Expected: New exports land in fallback; audit trail updated.
- [ ] Reduce batch size:
  - Command: `exportctl update --job <job-id> --chunk-size 50MB`
  - Expected: Throughput stabilizes; fewer timeout errors.

## Recovery Verification

- [ ] Export success rate returns to baseline for 15 minutes.
- [ ] Checksums verified for affected jobs; customers notified of re-exports.
- [ ] Fallback bucket disabled; configuration reverted.

## Communication

- [ ] Provide updates every 15 minutes with job success rate and mitigations.
- [ ] Summarize affected tenants, files, and corrective actions for audit.
