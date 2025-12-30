# Order-to-Cash (O2C) Event Map

This document defines the standard lifecycle events for the Order-to-Cash process, specifically focusing on receipt processing. These events are designed to be immutable, verifiable, and audited via the Provenance Ledger.

## Event Lifecycle

The following events track the progression of a receipt from ingestion to reconciliation.

### 1. RECEIPT_INGESTED
- **Description**: Triggered when a raw receipt file or data stream is first received by the system.
- **Trigger**: File upload, API webhook, or email attachment ingestion.
- **Required Provenance Fields**:
  - `source_id`: Origin identifier (e.g., S3 bucket key, email ID).
  - `ingestion_timestamp`: ISO 8601 timestamp.
  - `raw_content_hash`: SHA-256 hash of the raw payload.
  - `tenant_id`: The tenant associated with the ingestion channel.

### 2. RECEIPT_VALIDATED
- **Description**: Triggered after the raw payload passes structural and schema validation.
- **Trigger**: Successful execution of schema validation logic (e.g., JSON Schema, XML XSD).
- **Required Provenance Fields**:
  - `validation_policy_id`: ID of the policy used for validation.
  - `validation_status`: "SUCCESS".
  - `parser_version`: Version of the parser used.

### 3. RECEIPT_DEDUPED
- **Description**: Triggered when the system confirms this receipt is unique and not a duplicate of a previously processed receipt.
- **Trigger**: Successful check against the deduplication index (e.g., hash or invoice number check).
- **Required Provenance Fields**:
  - `deduplication_method`: Algorithm used (e.g., "EXACT_HASH", "FUZZY_MATCH").
  - `unique_identifier`: The derived ID used for uniqueness (e.g., Invoice Number + Vendor ID).

### 4. RECEIPT_PERSISTED
- **Description**: Triggered when the validated and unique receipt data is durably stored in the primary database.
- **Trigger**: Successful database commit.
- **Required Provenance Fields**:
  - `storage_location`: URI or Table/ID reference.
  - `persistence_timestamp`: ISO 8601 timestamp.
  - `encryption_key_id`: ID of the key used for encryption at rest (if applicable).

### 5. RECEIPT_POSTED
- **Description**: Triggered when the financial transaction corresponding to the receipt is posted to the General Ledger (GL) or sub-ledger.
- **Trigger**: Confirmation from the ERP system or internal ledger service.
- **Required Provenance Fields**:
  - `gl_entry_id`: Reference ID in the General Ledger.
  - `posting_date`: Date the entry affects the books.
  - `amount`: Monetary value posted.
  - `currency`: Currency code.

### 6. RECEIPT_RECONCILED
- **Description**: Triggered when the posted receipt is matched against a bank statement or payment record, closing the loop.
- **Trigger**: Successful execution of the reconciliation job.
- **Required Provenance Fields**:
  - `reconciliation_id`: ID of the reconciliation batch or record.
  - `match_type`: "AUTOMATIC" or "MANUAL".
  - `bank_transaction_id`: Reference to the external bank transaction.
  - `variance`: Any difference between receipt and payment (should be 0 for perfect match).

## Provenance Integration

All events must be recorded in the Provenance Ledger using the `O2CEvent` enum values. The `payload` field of the provenance entry should contain the specific data associated with the event.
