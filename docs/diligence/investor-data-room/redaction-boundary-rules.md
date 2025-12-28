# Redaction & Boundary Rules

This data room intentionally omits sensitive materials. The exclusions are explicit and documented.

## Not Shared (Intentional)

1. **Customer-identifying data and private contracts**
   - **Why**: confidentiality and legal obligations.
   - **Condition to share**: executed NDA and customer consent.
2. **Live credentials, secrets, or access tokens**
   - **Why**: security and least-privilege policy.
   - **Condition to share**: never shared; access is provisioned through secure channels only.
3. **Detailed exploit paths or offensive security details**
   - **Why**: reduces operational security risk.
   - **Condition to share**: vetted security review under NDA and need-to-know.
4. **Internal incident logs with sensitive telemetry**
   - **Why**: contains operational and potentially sensitive metadata.
   - **Condition to share**: redacted summaries may be shared for diligence under NDA.
5. **Forward-looking pricing commitments or pipeline details**
   - **Why**: competitive and contractual sensitivity.
   - **Condition to share**: only after term sheet or formal diligence phase.

## Boundary Enforcement

- All redactions are logged and attributable.
- Any exception requires written approval from governance owners.

**Evidence pointers**

- [Security policy](../../SECURITY.md)
- [Data retention policy](../RETENTION_POLICY.md)
- [Diligence red flags](../RED_FLAGS.md)
