# Prompt #8: Ingest Wizard + PII + License/TOS Enforcement

**Target**: Core GA Q3 2025
**Owner**: Data platform team
**Depends on**: Ingest service, License registry, PII classifier

---

## Pre-Flight Checklist

```bash
# ✅ Check existing ingest service
ls -la services/ingest/
cat services/ingest/README.md

# ✅ Verify connectors
ls -la services/ingest/src/connectors/

# ✅ Check license registry
grep -r "license\|tos" services/*/src/ | head -10
```

**Expected**: Ingest service exists (FastAPI), supports CSV/JSON/S3/Postgres.

---

## Claude Prompt

```
You are implementing the Ingest Wizard for IntelGraph - a no-code data mapper with PII detection and license enforcement.

CONTEXT:
- Existing: services/ingest/ (FastAPI, supports CSV/JSON/S3/Postgres)
- Connectors: services/ingest/src/connectors/HttpCsvConnector.ts
- Stack: FastAPI (Python), React, Neo4j, PostgreSQL
- Frontend: apps/web/src/components/

REQUIREMENTS:
Build an ingest wizard that paralegals can use:

1. **Connector Support (First 10)**:
   Implement or extend connectors for:
   - ✅ CSV/TSV (already exists)
   - ✅ JSON/NDJSON (already exists)
   - ✅ PostgreSQL (already exists)
   - ✅ S3 (already exists)
   - 🆕 MySQL
   - 🆕 Google Sheets (via API)
   - 🆕 Azure Blob Storage
   - 🆕 JDBC (generic: Oracle, SQL Server)
   - 🆕 REST API (configurable endpoints)
   - 🆕 Email (IMAP/EML parsing)

2. **Schema Mapping Wizard UI**:
   - apps/web/src/components/ingest/IngestWizard.tsx
   - Steps:
     1. Select connector type
     2. Configure source (credentials, table/file/bucket)
     3. Preview data (first 100 rows)
     4. Map fields: Source → Canonical entities
     5. PII detection & redaction
     6. DPIA checklist (GDPR compliance)
     7. Review & submit
   - AI suggestions: "email → person.email", "company_name → organization.name"
   - Drag-and-drop mapping

3. **AI-Powered Mapping Suggestions**:
   - Analyze column names + sample values
   - Suggest: {sourceField: "full_name", targetEntity: "person", targetField: "name", confidence: 0.92}
   - Use: Simple NLP (keyword matching) OR lightweight model (TF-IDF similarity)
   - User can accept/reject/modify suggestions

4. **PII Classifier**:
   - Scan: Column data for PII patterns (email, phone, SSN, credit card)
   - Regex patterns + NER (spaCy or simple regex)
   - Tag columns: {column: "ssn", piiType: "SSN", sensitivity: "high"}
   - Redaction presets: MASK (***-**-1234), HASH (sha256), REMOVE, ENCRYPT

5. **DPIA Checklist (GDPR Compliance)**:
   - UI: Checkbox list (Data Protection Impact Assessment)
   - Questions:
     - "Does this dataset contain personal data?"
     - "Is there a legal basis for processing? (consent/contract/legal)"
     - "Is data minimization applied?"
     - "Are retention policies defined?"
   - Block ingestion if mandatory checks fail
   - Log: DPIA responses in audit trail

6. **License/TOS Enforcement**:
   - services/license-registry/
   - Store: Data source licenses (CSV, JSON, DB)
   - Schema: {sourceId, licenseName, allowedUses[], restrictions[], expiresAt}
   - Enforcement:
     - At field level: Block export of restricted fields
     - At query level: Check license before returning data
     - Human-readable reasons: "Field X blocked: TOS restricts commercial use"
   - UI: Show license summary in data preview

7. **Redaction Presets**:
   - Presets: [PII_BASIC, PII_STRICT, HIPAA, GDPR]
   - PII_BASIC: Mask SSN, email, phone
   - PII_STRICT: Remove all PII fields
   - HIPAA: Redact 18 identifiers (name, DOB, zip, etc.)
   - GDPR: Hash or pseudonymize
   - User selects preset → Auto-apply redaction rules

8. **Golden Dataset + IO Tests**:
   - services/ingest/tests/golden/sample-*.csv (10 test files)
   - Test: Ingest → Verify entities created in Neo4j
   - Assertions: Field mapping correct, PII redacted, lineage recorded

DELIVERABLES:

1. services/ingest/src/connectors/ (extend with 5 new connectors)
   - MySQLConnector.ts
   - GoogleSheetsConnector.ts (use Google Sheets API)
   - AzureBlobConnector.ts
   - JDBCConnector.ts (generic wrapper)
   - RESTAPIConnector.ts

2. services/ingest/src/connectors/EmailConnector.ts
   - Parse: IMAP or .eml files
   - Extract: Headers (from, to, date) → metadata
   - Attachments → Store as evidence files

3. services/ingest/src/mapping/ai-mapper.ts
   - export class AIMappingEngine
   - Methods: suggestMappings(columns, sampleData), scoreConfidence(suggestion)
   - Use: TF-IDF similarity or simple keyword matching

4. services/ingest/src/pii/classifier.ts
   - export class PIIClassifier
   - Methods: detectPII(column, samples), classifyType(value)
   - Patterns: Regex for email, phone, SSN, credit card
   - Optional: spaCy NER for names, locations

5. services/ingest/src/pii/redactor.ts
   - export class Redactor
   - Methods: applyPreset(preset, data), redactField(field, method)
   - Methods: MASK, HASH, REMOVE, ENCRYPT

6. services/license-registry/
   - FastAPI or Node.js service
   - Routes:
     - POST /licenses (register license)
     - GET /licenses/{sourceId}
     - POST /licenses/check (check if action allowed)
   - Schema: licenses table (PostgreSQL)

7. apps/web/src/components/ingest/IngestWizard.tsx
   - Multi-step wizard (react-step-wizard or custom)
   - Steps: Connector → Configure → Preview → Map → PII → DPIA → Submit
   - Mapping UI: Drag source fields to target entity/field
   - AI suggestions: Show confidence badge, allow accept/reject

8. apps/web/src/components/ingest/MappingCanvas.tsx
   - Visual mapper: Left panel (source fields), right panel (target entities)
   - Drag & drop: Connect source → target
   - AI badge: Green checkmark for high confidence, yellow for low

9. apps/web/src/components/ingest/PIIPanel.tsx
   - Table: Column | PII Type | Sensitivity | Redaction Method
   - Dropdowns: Select redaction preset or custom
   - Preview: Show redacted sample data

10. apps/web/src/components/ingest/DPIAChecklist.tsx
    - Checkbox list with explanations
    - Block submit if mandatory checks unchecked
    - Save responses to audit log

11. server/src/routes/ingest-proxy.ts
    - Proxy: Frontend → Ingest service
    - POST /api/ingest/jobs (start ingestion)
    - GET /api/ingest/jobs/{jobId} (status)
    - POST /api/ingest/mappings/suggest (AI suggestions)

12. Tests:
    - services/ingest/tests/golden/test_csv_ingest.py
    - services/ingest/tests/golden/test_mysql_ingest.py
    - services/ingest/tests/pii/test_classifier.py
    - Integration: Ingest CSV → Verify entities in Neo4j → Check lineage

ACCEPTANCE CRITERIA:
✅ Map CSV/JSON → Canonical entities in ≤10 minutes (paralegal test)
✅ PII classifier detects email/phone/SSN with ≥95% recall
✅ License enforcement blocks restricted fields (test with sample TOS)
✅ DPIA checklist blocks ingestion if mandatory checks fail
✅ Lineage recorded: Source file → Entities (graph path)

TECHNICAL CONSTRAINTS:
- Connectors: Standardized interface (ConnectorSDK.ts)
- PII detection: Regex + optional NER (spaCy if available)
- License storage: PostgreSQL with JSON column for rules
- Redaction: Deterministic (same input → same hash)
- UI: Mobile-friendly (responsive design)

SAMPLE CONNECTOR INTERFACE (ConnectorSDK.ts):
```typescript
export interface DataConnector {
  type: string; // 'csv' | 'mysql' | 'google-sheets' | ...
  configure(config: Record<string, any>): Promise<void>;
  preview(limit: number): Promise<Row[]>;
  fetchAll(): AsyncIterable<Row>;
  getSchema(): Promise<Column[]>;
}

export interface Row {
  [column: string]: any;
}

export interface Column {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  samples: any[];
}
```

SAMPLE MAPPING SUGGESTION (AI):
```json
{
  "sourceField": "email_address",
  "targetEntity": "person",
  "targetField": "email",
  "confidence": 0.95,
  "reasoning": "Column name contains 'email', sample values match email pattern"
}
```

SAMPLE PII DETECTION:
```python
import re

class PIIClassifier:
    def detect_pii(self, column: str, samples: list[str]) -> dict:
        patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
            'credit_card': r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b',
        }

        detected = []
        for pii_type, pattern in patterns.items():
            if any(re.search(pattern, str(val)) for val in samples if val):
                detected.append(pii_type)

        return {
            'column': column,
            'piiTypes': detected,
            'sensitivity': 'high' if detected else 'low',
        }
```

SAMPLE LICENSE REGISTRY SCHEMA (PostgreSQL):
```sql
CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE,
  license_name TEXT NOT NULL,
  allowed_uses TEXT[] DEFAULT '{}',
  restrictions TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE license_rules (
  id SERIAL PRIMARY KEY,
  license_id INT REFERENCES licenses(id),
  field_pattern TEXT, -- e.g., '*.ssn', 'person.email'
  action TEXT, -- 'block_export', 'require_approval', 'log_access'
  reason TEXT
);
```

SAMPLE DPIA CHECKLIST:
```json
{
  "questions": [
    {
      "id": "q1",
      "text": "Does this dataset contain personal data?",
      "required": true,
      "answer": null
    },
    {
      "id": "q2",
      "text": "Is there a legal basis for processing? (consent/contract/legal obligation)",
      "required": true,
      "answer": null
    },
    {
      "id": "q3",
      "text": "Is data minimization applied?",
      "required": false,
      "answer": null
    },
    {
      "id": "q4",
      "text": "Are retention policies defined?",
      "required": true,
      "answer": null
    }
  ]
}
```

OUTPUT:
Provide:
(a) 5 new connector implementations
(b) AI mapping engine (TF-IDF or keyword-based)
(c) PII classifier (regex + optional NER)
(d) License registry service
(e) React wizard UI (7 steps)
(f) Golden dataset (10 test files)
(g) Integration tests (CSV → Neo4j)
(h) User guide (paralegal-friendly)
```

---

## Success Metrics

- [ ] Paralegal maps CSV → entities in ≤10 minutes (user test)
- [ ] PII detection ≥95% recall on test dataset
- [ ] License rules block 100% of restricted exports
- [ ] DPIA blocks ingestion if required checks fail
- [ ] 10/10 golden dataset files ingest correctly

---

## Follow-Up Prompts

1. **Auto-mapping**: ML model learns from user corrections
2. **Incremental ingest**: Detect changes, ingest only deltas
3. **Multi-source joins**: Merge data from multiple sources

---

## References

- Existing service: `services/ingest/README.md`
- Connectors: `services/ingest/src/connectors/HttpCsvConnector.ts`
- PII regex patterns: https://rgxdb.com/
- GDPR DPIA: https://gdpr.eu/data-protection-impact-assessment-template/
