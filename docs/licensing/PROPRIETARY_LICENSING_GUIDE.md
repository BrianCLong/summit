# Summit Proprietary Licensing Transition Guide

This guide documents the organization-wide shift from open-source licensing to a proprietary, contract-governed model for the Summit platform. It explains what changed, how the licensing model applies to code, models, data, and artifacts, and what teams must do to remain compliant when building, packaging, and distributing Summit assets.

## Executive Summary

- **License Authority:** The project is now governed by the Summit Enterprise License Agreement (see `LICENSE`), replacing any prior open-source notices.
- **Applicability:** All first-party code, models, prompts, datasets, documentation, and build artifacts are covered; only third-party dependencies retain their original licenses.
- **Distribution Policy:** External distribution requires a signed commercial agreement; no public redistribution, SaaS resale, or derivative publishing is allowed without written consent.
- **Operational Impact:** Build metadata, package manifests, and container labels now declare proprietary licensing. CI/CD owners must ensure new artifacts follow the same pattern.
- **Customer Experience:** Existing pilots continue under their commercial terms; community users must transition to a commercial agreement for ongoing access.

## Scope and Definitions

- **First-Party Assets:** Source code, compiled binaries, container images, model weights, embeddings, prompts, workflows, dashboards, playbooks, data seeds, and generated documentation originating from Summit.
- **Third-Party Components:** Open-source packages bundled as dependencies; their licenses and obligations remain intact and must be preserved in NOTICE/SBOM outputs.
- **Authorized Users:** Individuals covered by a valid commercial agreement or evaluation order form executed with Summit.
- **Prohibited Users:** Any party without contractual coverage, or parties in embargoed or sanctioned jurisdictions.

## Key Policy Changes

1. **License Grant Narrowed**
   - Internal business use only; sublicensing, hosting-as-a-service, or competitive model training are prohibited without written permission.
   - Reverse engineering, model extraction, and benchmark publication require prior written consent.
2. **Attribution**
   - Proprietary notices must remain intact in source, binaries, UI footers, and documentation exports.
   - Open-source attribution for bundled dependencies must remain unchanged.
3. **Security and Export Controls**
   - Deployments must follow export compliance screening; deployment to sanctioned jurisdictions is forbidden.
   - Access control must enforce customer scoping and least privilege for admins and operators.
4. **Data Handling**
   - Customer data ingested into Summit is subject to contractual data protection terms. No external sharing is allowed without customer approval.
5. **Support and SLAs**
   - Support obligations flow from the executed commercial agreement; community support channels are decommissioned for core Summit artifacts.

## Packaging and Metadata Updates

- **npm Manifests:** Package `license` fields now reference `SEE LICENSE IN LICENSE` to indicate proprietary terms while retaining third-party dependency metadata.
- **Container Images:** OCI labels declare `org.opencontainers.image.licenses="Proprietary"` to prevent accidental downstream consumption as open-source images.
- **Documentation Bundles:** Generated PDFs or HTML exports must include the proprietary watermark and link to the Enterprise License.
- **Source Headers:** New source files should retain the proprietary copyright banner used elsewhere in the codebase.

## Build and Release Controls

- **CI Checks:** Add or maintain pipelines that lint package manifests for proprietary license declarations prior to publish or artifact promotion.
- **SBOMs:** Ensure SBOM generation continues to capture third-party licenses while marking Summit-owned packages as proprietary.
- **Artifact Promotion:** Release managers should gate promotions (QA → Staging → Prod) on evidence that packages and container labels carry the proprietary tag.
- **Sigstore / Provenance:** When signing images or packages, include the proprietary license identifier in attestation metadata.

## Access and Distribution Rules

- **Internal Use:** Engineering and field teams may clone, build, and deploy for internal validation or customer delivery consistent with active agreements.
- **Customer Delivery:** Provide binaries, images, or hosted access only to customers under contract. Use license keys or SSO to enforce user-level gating.
- **Evaluation Use:** Time-boxed proofs of concept require signed evaluation terms; disable long-lived credentials at evaluation end.
- **Prohibited Channels:** No public npm publish, Docker Hub public tags, or public model checkpoints without a written exception.

## Migration Guidance for Existing Users

1. **Inventory Current Deployments**
   - Identify running Summit instances, SaaS tenants, and shipped images. Confirm which customers and regions they serve.
2. **Contract Alignment**
   - Map each deployment to a signed agreement; pause or restrict access where agreements are absent or expired.
3. **Artifact Refresh**
   - Rebuild client-specific images and binaries using the new licensing metadata and redistribute through controlled channels.
4. **Credential Rotation**
   - Rotate API tokens, license keys, and secrets after migrating to proprietary builds. Enforce MFA for admin roles.
5. **Communication**
   - Notify customers about the licensing shift, highlighting unchanged support terms and any new access controls.

## Responsibilities by Team

### Engineering

- Update new packages, services, and agents to use proprietary license strings.
- Keep OCI metadata in sync with licensing terms for all containerized workloads.
- Ensure telemetry, prompts, and models in model registries are marked proprietary with appropriate access controls.

### Product & GTM

- Refresh datasheets, sales one-pagers, and demo environments to reflect the proprietary model.
- Coordinate with Legal on pricing and licensing addenda for new features or regions.

### Security & Compliance

- Validate export-control and sanctions screening for every customer organization and deployment region.
- Maintain audit trails for distribution events (who accessed which artifact, when, and under what agreement).
- Review SBOMs to ensure third-party attributions remain intact and no copyleft contamination is introduced.

### Customer Success & Support

- Use contract-aware entitlement checks before provisioning tenants or enabling premium modules.
- Document support obligations by tier (Response times, RPO/RTO, maintenance windows) in customer runbooks.

## Third-Party Dependencies

- The proprietary model applies only to Summit-owned assets. Do **not** alter third-party licenses.
- Preserve NOTICE files, license headers, and SBOM outputs for dependencies.
- Respect license obligations when shipping embedded dependencies (e.g., include copy of licenses where required).

## Compliance and Audit Checklist

- [ ] Package manifests use `SEE LICENSE IN LICENSE` (no `MIT`/`ISC` strings for first-party code).
- [ ] OCI labels set to `Proprietary` on all published images.
- [ ] Releases documented with contract identifier and customer scope.
- [ ] Access controls enforce tenant isolation and role-based permissions.
- [ ] Audit logs retained for artifact access, downloads, and deployment actions.
- [ ] Export screening completed for customer org and hosting region.
- [ ] Data residency and encryption requirements configured per contract.
- [ ] Third-party licenses preserved and bundled where required.

## Operational Runbook (Abbreviated)

1. **Pre-Release**
   - Run license linting on package.json files.
   - Confirm Dockerfile labels and Helm chart annotations reflect proprietary licensing.
   - Generate SBOM and attach to release candidate.
2. **Release**
   - Sign images and binaries; store signatures with license metadata.
   - Publish artifacts to private registries with scoped credentials.
3. **Post-Release**
   - Monitor download/access logs for unauthorized use.
   - Rotate credentials if leak indicators appear.

## FAQ

- **Can customers benchmark Summit publicly?**
  Only with explicit written approval and subject to NDA.
- **Can we open-source small utilities?**
  Utilities not derived from proprietary IP may be open-sourced after legal review; core Summit assets remain proprietary.
- **Do we still use open-source dependencies?**
  Yes; dependency licenses remain unchanged, and we must honor their terms.
- **How are evaluation keys handled?**
  Evaluation keys should auto-expire and be scoped to non-production data sets.

## Forward-Looking Enhancements

- Automate license validation in CI using a policy-as-code check that blocks merges when first-party packages use non-proprietary identifiers.
- Add registry-side admission controls to reject image pushes lacking `Proprietary` labels or provenance attestations.
- Integrate entitlement service hooks so runtime feature flags validate license scope (customer, region, module) before activation.

## Contacts

For licensing questions or approvals, contact the Summit Legal and Compliance team at `legal@topicality.summit` and the product counsel alias `product-legal@topicality.summit`.
