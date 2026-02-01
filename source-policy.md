# Source Policy: Narrative Intelligence

## Allowed Sources
1. **OSINT Feeds**: Publicly available data (news, social media) ingested via `ingest/`.
2. **Partner Feeds**: Authorized data streams from partners.
3. **Internal Data**: `summit` produced artifacts.

## Restrictions
1. **Proprietary/Copyrighted Content**:
    - Do not store full text of copyrighted news articles if not licensed.
    - Store derived features (Narrative Skeletons, Frame Elements) which are transformative.
2. **PII**:
    - Apply `summit/context_engineering/redaction.py` rules.
    - Anonymize actor names if they are private individuals (not public figures).
3. **Provenance**:
    - All extracted data must link back to the source `doc_id`.
    - Maintain `evidence_id` for all processing runs.

## Governance
- **Retention**: Tenant-configurable TTL.
- **Access**: RBAC enforced via Tenant ID.
