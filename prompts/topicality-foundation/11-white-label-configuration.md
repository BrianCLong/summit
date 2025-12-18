# Prompt 11: White-Label Configuration & Tenant Customization Engine

**Tier:** 2 - Application Features
**Priority:** Medium
**Effort:** 1 week
**Dependencies:** Prompts 1, 4
**Blocks:** Prompts 6, 9
**Parallelizable:** Yes (with Prompt 10)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- Topicality must be white-labelable:
  - different org names,
  - configurable metrics targets,
  - industry/vertical-specific policies and templates.
- We need a configuration engine that supports multi-tenant settings for:
  - branding,
  - KPI targets,
  - policy bundles,
  - document templates.

Goal:
Implement a minimal "tenant configuration" service/module that:
- stores per-tenant config,
- exposes it via API,
- is safe and auditable.

Assumptions:
- Use same stack as other services (TypeScript/Node or Python + Postgres/SQLite).
- No fancy UI yet; just APIs and config structures.

Requirements:
1. Config model
   - Tenant: tenant_id, name, slug, created_at.
   - BrandingConfig: logo_url, primary_color, org_display_name.
   - MetricsConfig: per-KPI targets (e.g., time_to_first_value_days <= 14).
   - PolicyBundleConfig: list of policy IDs or names (e.g., "default_gdpr", "healthcare_strict").
   - TemplateConfig: mapping from canonical doc types to template IDs or overrides.

2. API
   - CRUD for tenants (with safeguards: no hard delete, use soft delete if needed).
   - Get config for tenant_id.
   - Update specific config sections (branding, metrics, policies, templates).
   - Validation to avoid invalid KPI targets (e.g., negative numbers).

3. Integration examples
   - Show how:
     - CEO Dispatch generator can pull metrics targets per tenant.
     - Template engine can select tenant-specific templates.

4. Tests & docs
   - Unit tests for config validation and retrieval.
   - README explaining:
     - configuration schema,
     - examples for two different tenants with different KPIs and templates.

Deliverables:
- Data model and migrations.
- Service/module code.
- Example configs.
- Tests and README.
