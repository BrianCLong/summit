# MDM Best Practices

## Golden Record Management

### Survivorship Rule Design

**Principle:** Design survivorship rules that balance data quality, recency, and source trustworthiness.

#### Best Practices:

1. **Field-Level Rules**: Define survivorship at the field level, not record level
   ```typescript
   const rules = [
     { fieldName: 'email', strategy: 'most_recent' },
     { fieldName: 'address', strategy: 'most_trusted_source' },
     { fieldName: 'phone', strategy: 'highest_quality' }
   ];
   ```

2. **Source Prioritization**: Rank sources based on reliability
   ```typescript
   const sources = [
     { system: 'CRM', priority: 1, confidence: 0.95 },
     { system: 'ERP', priority: 2, confidence: 0.85 },
     { system: 'Legacy', priority: 3, confidence: 0.70 }
   ];
   ```

3. **Temporal Considerations**: Factor in data freshness
   - Use 'most_recent' for frequently changing attributes
   - Use 'most_trusted_source' for stable attributes

4. **Quality-Based Selection**: Prefer higher quality sources
   - Implement quality scoring for each source
   - Use 'highest_quality' strategy for critical fields

### Merge Strategy

**DO:**
- Review match results before merging
- Document merge decisions
- Maintain lineage of merged records
- Implement undo capability

**DON'T:**
- Auto-merge without validation
- Lose source record history
- Merge across different entity types
- Skip conflict resolution

## Entity Matching

### Algorithm Selection

**Exact Matching**: Use for unique identifiers
```typescript
{ fieldName: 'ssn', comparator: 'exact', weight: 1.0 }
```

**Fuzzy Matching**: Use for names and addresses
```typescript
{ fieldName: 'name', comparator: 'jaro_winkler', weight: 0.6 }
```

**Phonetic Matching**: Use for names with spelling variations
```typescript
{ fieldName: 'lastName', comparator: 'soundex', weight: 0.5 }
```

**Token-Based**: Use for multi-word fields
```typescript
{ fieldName: 'companyName', comparator: 'token_set', weight: 0.7 }
```

### Threshold Tuning

1. **Start Conservative**: Begin with high thresholds (0.90+)
2. **Monitor Results**: Track false positives and false negatives
3. **Iterative Refinement**: Adjust based on business feedback
4. **Document Decisions**: Record rationale for threshold values

### Blocking Strategies

Implement blocking to improve performance:

```typescript
{
  blockingEnabled: true,
  blockingStrategy: {
    blockingKeys: [
      { fields: ['zip', 'lastName'], weight: 1.0 },
      { fields: ['email'], weight: 1.0 }
    ],
    maxBlockSize: 10000,
    minBlockSize: 2
  }
}
```

**Best Practices:**
- Use selective blocking keys
- Monitor block size distribution
- Implement multi-pass blocking for comprehensive coverage

## Data Quality

### Rule Definition

1. **Comprehensive Coverage**: Define rules for all quality dimensions
   - Completeness
   - Accuracy
   - Consistency
   - Validity
   - Uniqueness
   - Timeliness

2. **Business Context**: Align rules with business requirements
   ```typescript
   {
     id: 'customer-email-required',
     name: 'Email Required for Active Customers',
     expression: 'status == "active" AND email required',
     severity: 'high'
   }
   ```

3. **Prioritization**: Focus on high-impact fields
   - Identify critical data elements
   - Implement stricter rules for critical fields
   - Balance coverage with maintainability

### Quality Monitoring

**Continuous Assessment:**
```typescript
// Run quality checks on data ingestion
await qualityEngine.assessQuality(recordId, domain, data, rules);

// Track quality metrics over time
const trends = await analyticsEngine.getQualityTrends('customer', '30d');
```

**Alerting:**
- Set up alerts for quality score drops
- Notify stewards of critical issues
- Implement escalation procedures

### Auto-Fix Implementation

**Safe Auto-Fix:**
```typescript
{
  ruleType: 'invalid_format',
  autoFix: true,
  fixLogic: 'standardizePhoneNumber'
}
```

**Guidelines:**
- Only auto-fix deterministic issues
- Log all auto-fix actions
- Allow manual override
- Regular review of auto-fix results

## Reference Data Management

### Code List Governance

1. **Centralized Management**: Single source of truth
2. **Version Control**: Maintain version history
3. **Change Management**: Controlled update process
4. **Documentation**: Document each code's meaning and usage

### Naming Conventions

```typescript
// Good
const codeListName = 'iso_country_codes';
const code = { code: 'US', value: 'United States' };

// Bad
const codeListName = 'countries';
const code = { code: 'USA', value: 'US' };
```

### Distribution

1. **API Access**: Provide REST API for code list access
2. **Caching**: Implement caching for performance
3. **Subscriptions**: Allow systems to subscribe to updates
4. **Versioning**: Support multiple active versions

## Hierarchical Data

### Hierarchy Design

**Best Practices:**

1. **Single Root**: Each hierarchy should have one root node
2. **Consistent Depth**: Maintain similar depths across branches
3. **Meaningful Levels**: Each level should represent a logical grouping
4. **Temporal Support**: Track effective dates for hierarchy changes

### Validation

Implement validation rules:
```typescript
{
  maxDepth: 10,
  maxChildren: 100,
  allowCycles: false,
  allowMultipleParents: false
}
```

### Performance

- Index path fields for traversal queries
- Cache frequently accessed hierarchies
- Implement lazy loading for large hierarchies
- Use materialized paths for efficient queries

## Data Synchronization

### Sync Configuration

**Best Practices:**

1. **Incremental Sync**: Use delta changes when possible
2. **Error Handling**: Implement robust error handling and retry logic
3. **Conflict Resolution**: Define clear conflict resolution strategies
4. **Monitoring**: Track sync job metrics and failures

### Conflict Resolution

**Strategy Selection:**

- **Most Recent**: Use for frequently updated fields
- **Source Priority**: Use when source reliability is clear
- **Manual Review**: Use for critical or uncertain conflicts

```typescript
{
  conflictResolution: {
    strategy: 'most_recent',
    notifyOnConflict: true,
    autoResolve: false  // Require manual review
  }
}
```

### Scheduling

```typescript
// High-frequency for critical data
{ scheduleType: 'interval', interval: 300, intervalUnit: 'seconds' }

// Batch for bulk updates
{ scheduleType: 'cron', cronExpression: '0 2 * * *' }  // Daily at 2 AM
```

## Data Stewardship

### Workflow Design

1. **Clear Ownership**: Assign stewards to domains
2. **Approval Hierarchies**: Define escalation paths
3. **SLAs**: Set response time expectations
4. **Documentation**: Maintain decision documentation

### Change Management

**Best Practices:**

1. **Impact Assessment**: Evaluate change impact before approval
2. **Testing**: Test changes in non-production environments
3. **Communication**: Notify affected stakeholders
4. **Rollback Plan**: Have rollback procedures ready

### Certification

```typescript
// Bronze: Basic quality checks passed
{ certificationLevel: 'bronze', qualityScore: 0.70 }

// Silver: Enhanced quality, steward reviewed
{ certificationLevel: 'silver', qualityScore: 0.85 }

// Gold: Highest quality, fully validated
{ certificationLevel: 'gold', qualityScore: 0.95 }

// Platinum: Gold + business validation
{ certificationLevel: 'platinum', qualityScore: 0.98 }
```

## Governance & Compliance

### Policy Definition

1. **Data Classification**: Classify data by sensitivity
2. **Access Control**: Implement role-based access
3. **Retention Policies**: Define data retention periods
4. **Privacy Compliance**: Implement GDPR, CCPA requirements

### Audit Trail

**Comprehensive Logging:**
```typescript
await governanceEngine.logAudit(
  userId,
  action,
  resourceType,
  resourceId,
  {
    before: oldValue,
    after: newValue,
    reason: justification,
    approver: approverId
  }
);
```

**What to Log:**
- All data modifications
- Access to sensitive data
- Configuration changes
- Failed authentication attempts
- Policy violations

### Compliance Reporting

**Regular Reports:**
- Weekly: Exception reports
- Monthly: Compliance metrics
- Quarterly: Executive summaries
- Annual: Comprehensive audits

## Performance Optimization

### Database Optimization

1. **Indexing**: Create indexes on frequently queried fields
2. **Partitioning**: Partition large tables by domain or date
3. **Query Optimization**: Use query plans and optimize joins
4. **Connection Pooling**: Maintain connection pools

### Caching Strategy

```typescript
// Reference data - long TTL
cacheConfig: { ttl: 3600, key: 'ref-data:{name}' }

// Master records - medium TTL
cacheConfig: { ttl: 900, key: 'master:{id}' }

// Quality scores - short TTL
cacheConfig: { ttl: 300, key: 'quality:{id}' }
```

### Batch Processing

```typescript
// Good - process in batches
for (const batch of batches) {
  await processRecords(batch);
}

// Bad - process one at a time
for (const record of records) {
  await processRecord(record);
}
```

## Security

### Data Protection

1. **Encryption**: Encrypt sensitive data at rest and in transit
2. **Masking**: Mask PII in non-production environments
3. **Tokenization**: Use tokens for highly sensitive data
4. **Access Logging**: Log all access to sensitive data

### API Security

```typescript
// Authentication required
app.use('/api', authenticate);

// Authorization checks
app.post('/api/master-records', authorize('mdm:write'), handler);

// Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

## Monitoring & Alerting

### Key Metrics

1. **Quality Metrics**: Track overall and dimensional quality scores
2. **Match Rates**: Monitor entity matching success rates
3. **Sync Performance**: Track sync job duration and throughput
4. **API Performance**: Monitor API response times
5. **Error Rates**: Track error and failure rates

### Alerting Thresholds

```typescript
const alerts = {
  qualityScoreDrop: { threshold: 0.10, severity: 'high' },
  syncFailureRate: { threshold: 0.05, severity: 'critical' },
  apiLatency: { threshold: 1000, severity: 'medium' },
  matchRateDrop: { threshold: 0.15, severity: 'high' }
};
```

## Disaster Recovery

### Backup Strategy

1. **Regular Backups**: Daily backups of master data
2. **Point-in-Time Recovery**: Enable PITR for databases
3. **Geo-Redundancy**: Replicate to multiple regions
4. **Testing**: Regular disaster recovery drills

### Recovery Procedures

1. **Document Procedures**: Maintain runbooks
2. **RTO/RPO Targets**: Define recovery objectives
3. **Validation**: Test recovered data
4. **Communication**: Notify stakeholders during recovery
