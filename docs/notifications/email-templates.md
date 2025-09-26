# Customizable Email Templates

Workstream 110 introduces tenant-scoped email templates for Summit notifications. Templates are rendered with a dedicated Handlebars runtime inside the Node.js service tier, persisted in PostgreSQL, and managed through GraphQL. This guide explains how to manage templates, apply branding, and integrate with downstream notification workflows (including Workstream 87 triggers).

## Data model

Email templates live in the `email_templates` table (PostgreSQL) with the following columns:

| Column | Purpose |
| --- | --- |
| `tenant_id` | Tenant scoping for multi-tenant isolation. |
| `template_key` | Logical identifier (e.g., `workstream87.alert`). |
| `subject_template` / `body_template` | Handlebars source strings rendered at send time. |
| `description` | Optional operator-facing description. |
| `branding` | JSON payload storing default branding metadata (logo URL, colors, etc.). |
| `created_at` / `updated_at` | Audit timestamps maintained by the repository. |

A migration (`009_create_email_templates.sql`) creates indexes for tenant lookups and keeps `updated_at` fresh via upsert logic.

## Rendering pipeline

1. **Fetch & cache** – `EmailTemplateService` loads the template for the tenant and caches compiled subject/body delegates per `(tenantId, key)`.
2. **Brand merge** – Default branding from the DB merges with per-request overrides so every render receives a single `brand` object. Undefined values are removed to avoid leaking stale data.
3. **Handlebars render** – The vendored Handlebars runtime compiles the subject and body; helpers/partials can be registered in future iterations.
4. **Plain-text fallback** – HTML output is condensed into a plain-text representation for providers that need it.

The rendered payload returns `{ subject, html, text, branding }`, ready for SMTP/ESP adapters.

## GraphQL API

Extend your schema client with the new fields (all resolvers enforce tenant ownership or elevated roles such as `ADMIN`/`OPERATOR`):

```graphql
query EmailTemplates($tenantId: ID!) {
  emailTemplates(tenantId: $tenantId) {
    key
    description
    branding { companyName primaryColor footerText }
  }
}

mutation UpsertEmailTemplate($tenantId: ID!, $input: UpsertEmailTemplateInput!) {
  upsertEmailTemplate(tenantId: $tenantId, input: $input) {
    key
    updatedAt
  }
}

mutation RenderEmailTemplate($tenantId: ID!, $key: ID!, $context: JSON!, $brand: EmailBrandingInput) {
  renderEmailTemplate(
    tenantId: $tenantId,
    key: $key,
    input: { context: $context, brandOverrides: $brand }
  ) {
    subject
    html
    text
  }
}
```

### Input conventions

- `context` can contain any JSON payload needed by your template (`{{user.name}}`, `{{incident.summary}}`, etc.).
- `branding` accepts fields `companyName`, `logoUrl`, `primaryColor`, `accentColor`, `supportEmail`, and `footerText`.
- Use meaningful `template_key` values such as `workstream87.notification` to align with notification triggers.

## Tenant branding strategy

1. **Defaults per template** – Store base branding (logo, palette, footer copy) in the template’s `branding` column so every render has a sensible default.
2. **Overrides per event** – When dispatching, pass `brandOverrides` for A/B copy, campaign-specific palettes, or incident-specific footers without mutating the stored template.
3. **Auditing** – The repository layer updates `updated_at` on every change. Pair with existing audit logging to capture operator ID when mutations are executed.

## Operational tips

- **Cache invalidation** – `EmailTemplateService` clears compiled caches on upsert/delete, so updates are live on the next render.
- **Testing** – Jest suites cover rendering and GraphQL authorization. Run `cd server && npm test` before promoting.
- **Extensibility** – Future enhancements can register Handlebars helpers (e.g., date formatting) by extending `EmailTemplateService` to call `this.handlebars.registerHelper` during construction.

## Next steps

- Wire `renderEmailTemplate` into the Workstream 87 notification dispatcher.
- Create administrative UI controls that leverage the GraphQL mutations to manage templates and branding assets.
- Track template versions and metrics (open/click) using the returned `subject`/`html` payloads.
