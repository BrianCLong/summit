# Audit Drill Queries

These queries can be executed automatically via `scripts/audit/run-queries.ts` to generate auditor-ready answers.

1. **Production-affecting changes (last 30 days)**  
   Show commits touching `services`, `server`, or `infrastructure` paths with their CI verification status.

2. **Unauthorized agent modification check**  
   Prove that protected files were not modified by unapproved agents by correlating provenance ledger entries with CODEOWNERS approvals.

3. **Technical debt trajectory**  
   Demonstrate monotonic reduction (or bounded movement) in debt scores using the weekly debt trend reports.

4. **Model output provenance**  
   Show the model version, dataset fingerprint, and guardrail decisions for a sampled AI output.

5. **Open exceptions and expiry status**  
   List current exceptions, their scope, and whether any are expired.

6. **SBOM and supply chain hygiene**  
   Provide the most recent SBOM hash and dependency scan results with attestation status.
