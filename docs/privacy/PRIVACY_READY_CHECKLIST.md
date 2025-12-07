# Privacy Readiness Checklist

Use this checklist to ensure your feature complies with CompanyOS privacy controls.

## 1. Data Modeling & Taxonomy
- [ ] **Data Classification**: Have you identified all data fields?
- [ ] **Taxonomy Mapping**: Are all PII fields mapped to the correct type in `server/src/pii/taxonomy.ts`?
- [ ] **Sensitivity Review**: Does the calculated `SensitivityClass` match expectations?
- [ ] **Minimization**: Are you storing *only* what is strictly necessary?
    - [ ] Can you use a boolean flag instead of the raw data? (e.g., `isOver18` vs `dateOfBirth`)
    - [ ] Can you store a hash instead of the value?

## 2. Ingestion & Storage
- [ ] **Ingestion Hooks**: Is the `IngestionHook` configured for your data pipeline?
- [ ] **Encryption**: Is `High` or `Critical` data encrypted at rest?
- [ ] **Separation**: Are credentials and secrets stored separately from identity data?
- [ ] **Retention**: Is a TTL (Time To Live) configured for ephemeral data?

## 3. Access Control & Redaction
- [ ] **Middleware**: Is the `RedactionMiddleware` applied to your API endpoints?
- [ ] **Role Testing**: Have you verified what `VIEWER`, `ANALYST`, and `ADMIN` see?
- [ ] **Masking Defaults**: Is sensitive data masked by default in the UI?
- [ ] **Justification**: Does the API require a `reason` or `purpose` for accessing sensitive fields?

## 4. Subject Rights (DSAR)
- [ ] **Locatability**: Can we find all records for a specific `subjectId`?
- [ ] **Deletability**: Does your service support a "hard delete" or "anonymize" operation?
- [ ] **Cascade**: Do deletions cascade correctly (or not) to related records?
- [ ] **Export**: Can your service produce a clean JSON dump of a user's data?

## 5. Logging & Telemetry
- [ ] **Log Scrubbing**: Are you ensuring NO PII is written to application logs?
- [ ] **Exception Safety**: Do error messages leak PII?
- [ ] **Metric Aggregation**: Are metrics free of high-cardinality PII (e.g., email in labels)?

## 6. Audit
- [ ] **Modification Audit**: Are creation/update/delete actions logged to the `ProvenanceLedger`?
- [ ] **Access Audit**: Is read access to sensitive data logged?

---
*If you checked all boxes, your feature is Privacy-Ready.*
