# Sprint 5 — White-Label Kit + Policy Profiles v1

## Theme and Goal
- **Theme:** Make Switchboard brandable, configurable, and safely shippable to partners.
- **Goal:** Ship a white-label kit that enables per-tenant branding, role catalogs, and policy profiles with export/import and strict multi-tenant isolation for internal, white-label, and hosted SaaS deploy modes.

## Target Outcomes
1. **White-Label Kit v1** – Brand packs (logo, colors, typography, wording) configurable per tenant; Switchboard renders tenant-specific branding without code changes.
2. **Role Catalogs & Policy Profiles v1** – Predefined catalogs (Admin, Operator, Compliance, Partner, etc.) and policy profiles (Strict, Standard, Relaxed/Sandbox) bundled for common deployment postures.
3. **Config Export/Import** – Export tenant/partner config (branding, roles, policies, feature flags) as a signed bundle; import with validation and provenance.
4. **Multi-Tenant Hardening** – Tenant boundary enforcement across UI, APIs, and policies with internal probes certifying “multi-tenant safe.”

## Epics and Key Work
### Epic A – Branding & Theme System
- **Theme System & Brand Packs:** Central design tokens for colors, typography, logos, wording; brand pack entity with metadata. At least two packs: Summit Internal and Partner Default. Switching packs in admin updates UI without deploy.
- **Tenant/Partner Branding Association:** Extend tenant/partner with `brand_pack_id`; resolve brand on login/context switch; prevent cross-tenant branding leakage; authorization around brand changes.
- **White-Label Ready Login & Shell:** Login and shell use brand tokens; support partner-specific routing/host hooks; demo two branded environments; E2E coverage and setup docs.

### Epic B – Role Catalogs & Policy Profiles
- **Role Catalog Definitions:** Data-driven catalogs for internal and partner personas with versioning/provenance; assignable via API/GUI; CI schema validation and documentation.
- **Policy Profiles:** OPA/ABAC bundles for `strict_compliance`, `standard_ops`, and `sandbox/dev` covering approvals, incidents, runbook controls, destructive ops. Profile switches are runtime-resolved with policy tests and coverage reporting.
- **Profile Assignment & Simulation:** UI/API for assigning profiles to tenants/partners; simulation UI/API to test decisions under a profile with provenance on simulations and E2E tests.

### Epic C – Configuration Bundles
- **Bundle Schema:** Single-file bundle (JSON/tar) covering brand packs, role assignments, policy selection, feature flags, optional seeds; includes metadata (version, environment, author, checksum) with documented versioning strategy.
- **Export Flow:** API/CLI export with scope filters (full, tenant-only, partner-only); signed manifest and integrity hash; provenance evidence and runbook for partner deployment export.
- **Import Flow & Safety Rails:** Dry-run diffing, approval gates for high-risk changes, apply with verification; documented multi-step flow and E2E import/export parity test.

### Epic D – Multi-Tenant Isolation & Certification
- **Tenant Boundary Audit & Hardening:** Enforce tenant ID across UI queries, APIs, graph expansions; regression/fuzz tests for tenant scoping; extend OPA/ABAC coverage.
- **“Multi-Tenant Safe” Certification:** Synthetic multi-tenant probes with PASS/FAIL dashboard; CI/pre-prod gate with runbook and provenance of certification results.

### Epic E – Packaging and Deploy Modes
- **Deploy Mode Configs:** Encode `internal`, `white_label`, and `hosted_saas` modes controlling defaults (brand pack, policy profile, feature visibility) with Helm/Terraform hooks and behavior validation; matrix doc and release note.
- **White-Label Cookbook & Partner Guide:** Documentation for branding, policy profiles, tenant onboarding, config export/import, and partner console usage with in-product help links.

## Success Targets
- **Performance:** Theme/brand resolution adds negligible overhead; export/import performant for typical sizes.
- **Security & Governance:** All configuration changes emit provenance; high-risk imports require approvals; multi-tenant certification must pass for `white_label` and `hosted_saas` modes before promotion.
- **Fundability / Sales Readiness:** Demo showing Summit and partner branding, policy profile switch behaviors, and shareable example config bundle.

## Risks and Mitigations
- **Cross-tenant leakage risk:** Enforce tenant scoping in policies, API queries, and UI context; automated probes and regression tests.
- **Unsafe branding assets:** Restrict asset types, validate uploads, and avoid arbitrary CSS injection; SBOM unchanged except theme loader.
- **Policy drift across tenants:** Versioned role catalogs/policy bundles with provenance; simulation tooling to verify decisions before apply.
- **Import integrity:** Signed bundles with checksums and dry-run diffing; approval workflow for high-impact changes.

## Delivery Proof Points
- Admin panel switch demonstrates Summit Internal vs Partner Default brand packs without redeploy.
- Two tenants in demo run different policy profiles (strict vs sandbox) with observable behavior changes.
- Export from staging applies cleanly to fresh dev via import with minimal diff.
- CI gate runs multi-tenant safety certification and blocks promotion on failure.
