# CompanyOS White-Labeling, Theming, and Multi-Brand Support

## High-level summary and principles

- Enable customers and partners to operate CompanyOS under their own brand while preserving platform security, reliability, and upgradeability.
- Treat branding, theming, and configuration as declarative data with explicit precedence (platform < environment < partner < tenant < user/experience surface) and immutable, versioned releases.
- Optimize for fast, cache-friendly delivery of theme assets with integrity guarantees, while keeping guardrails that prevent weakening required controls.

## Branding & theming model

### What is configurable (per theme)

- **Identity**: logo (primary, monochrome, favicon, app icon), wordmark lockups, loading indicators, watermark overlays.
- **Colors**: palette tokens (primary, secondary, accent, success, warning, danger, neutral), gradients, data-visualization palettes, semantic state mappings, light/dark variants.
- **Typography**: primary/secondary font families, weights, sizes/line-heights, heading scales, numeral styles, locale fallbacks.
- **Wording & copy**: product name, feature labels, action verbs, legal strings, notification text, marketing panels; localization bundles keyed by locale.
- **Layout & components**: border radii, shadows, density/spacing scale, button variants, table density, chart defaults, card/list styles, illustration packs.
- **Domain & routing**: vanity domains, email sender domains, preferred URL paths, feature deep-link patterns.
- **Communications**: email templates (transactional + marketing), SMS templates, push notification formats, in-app announcement themes.
- **Accessibility settings**: minimum contrast enforcement, motion-reduction defaults, high-contrast palette option, dyslexia-friendly fonts, focus outline style.
- **Operational toggles**: watermarking level, legal footer placement, cookie banner style, compliance badges.

### Override hierarchy

1. **Platform defaults**: secure baseline, maintained by CompanyOS.
2. **Environment** (dev/stage/prod/region): operational overrides (e.g., staging banner, test payment gateway branding).
3. **Partner**: shared defaults across the partner’s tenants (logos, palette, email domain, SLO posture). Partners cannot loosen mandatory controls (see guardrails).
4. **Tenant/customer**: per-tenant branding, domain, copy, and industry profile selection; inherits from partner.
5. **Experience surface**: runtime overrides for specific properties (e.g., campaign-specific banner) constrained by allowlist and TTL.

Conflict resolution: lowest level wins if allowed; forbidden keys fall back to higher-scope value with audit log entry. Missing values inherit from the next higher scope. All merges are validated against schema and guardrails.

### Performance and caching

- **Static asset separation**: upload logos/fonts to CDN with cache-busting file hashes; reference via signed URLs in the theme payload.
- **Edge caching**: cache resolved theme payloads (post-merge) at the edge keyed by {environment, partner, tenant, locale, surface, version}; short TTL for preview, longer for prod.
- **Deterministic payloads**: fully expanded, normalized theme JSON; avoid runtime DB hits on every request by precomputing on publish.
- **Client hydration**: ship minimal critical CSS variables + font declarations early; lazy-load extended palettes and illustration packs.
- **Integrity & isolation**: subresource integrity for fonts/assets; CSP restricts origins; per-tenant bucket paths; signed cookie/session prevents cross-tenant theme leakage.
- **Fail-safe**: if theme fetch fails, fall back to platform default while alerting and logging.

## Configuration profiles

### Profile purpose

- Provide curated defaults for **industries** (e.g., Finance, Healthcare, Public Sector), **regions** (e.g., EU, APAC, US FedRAMP), and **risk postures** (High, Standard, Low).
- Profiles bundle **policies**, **SLOs/SLAs**, **feature sets**, **data residency**, **audit retention**, **authN/Z defaults**, **DLP**, **observability**, and **privacy banners**.

### Packing defaults

- Declarative YAML/JSON documents referencing canonical policy IDs and feature flags.
- Include versioned **policy bundles** (e.g., `policy/baseline@1.3.0`, `policy/pci@2.0.1`).
- SLO objects define target/error budgets and alert thresholds; attach to services/components.
- Feature sets enumerate capabilities with exposure rules (role-based + entitlement-based).
- Data residency and storage class settings reference approved regions and encryption modes.

### Safe overrides & guardrails

- **Never-loosen list**: MFA required, password rotation minimums, audit log immutability, data encryption at rest/in transit, PII masking in logs, DLP baseline, rate-limits per API class, minimum contrast/accessibility settings.
- **Only-stronger overrides**: partners/tenants may tighten (e.g., shorter session TTL, stricter IP allowlists, higher SLO targets) but cannot relax below baseline.
- Validation pipeline enforces guardrails and emits diffs; violations are rejected with machine-readable errors.

## Management & rollout

- **APIs**: REST/GraphQL `themes` and `profiles` endpoints with CRUD, diff, validate, publish, rollback. Signed per-partner keys + RBAC + audit trails.
- **Console**: Partner console for branding uploads, live preview, A/B variants, scheduled releases; tenant admins can opt into profiles and adjust allowed fields.
- **Preview flows**: ephemeral preview tokens/URLs rendering merged theme/profile with short TTL; snapshotting of assets; accessibility and contrast checks in preview gate.
- **Versioning**: immutable versions (semver) for themes and profiles; promoted to environments via releases. Maintain changelog and provenance (who/when/what diff).
- **Rollback**: one-click/API rollback to prior version; assets kept for retention window; alerts notify if rollback triggered.
- **Canary/gradual rollout**: percentage- or cohort-based exposure controlled via feature flags; metrics on adoption and errors.
- **Testing**: automated validation (schema + guardrails), screenshot diff for UI regressions, accessibility scan, contract tests for email templates.

## Architecture

- **Data model**: `Theme` and `ConfigProfile` entities stored in versioned collections (e.g., Postgres + object storage for assets). `Release` references a specific theme/profile version per environment.
- **Merge engine**: deterministic merge/resolution layer applying hierarchy and guardrails; outputs normalized payload cached at edge.
- **Asset pipeline**: ingestion service validates file types/sizes, generates renditions (e.g., SVG/PNG, light/dark), uploads to per-tenant buckets with signed URLs.
- **Policy registry**: catalog of policy bundles and feature flags with immutability guarantees; references used in profiles.
- **Observability**: logs for mutations and render requests, metrics for cache hit/miss, theme payload size, preview usage, validation failures; traces for merge path.
- **Security**: CSP, SRI, mandatory asset scanning, RBAC for partner/tenant actions, per-tenant encryption keys, domain verification for custom domains and email senders.

## White-Label Config Schema (outline)

```yaml
apiVersion: companyos.io/v1
kind: Theme
metadata:
  id: theme-uuid
  name: "Acme Default"
  version: 1.2.0
  owner: partner:acme
  scope: tenant # enum: platform|environment|partner|tenant|surface
  inheritsFrom: theme-id-or-null
spec:
  identity:
    logos:
      primary: https://cdn.example.com/acme/logo.svg
      monochrome: https://cdn.example.com/acme/logo-mono.svg
      favicon: https://cdn.example.com/acme/favicon.ico
      appIcon: https://cdn.example.com/acme/app-icon.png
    watermark:
      enabled: false
      text: "ACME DRAFT"
  colors:
    mode: auto # light|dark|auto
    palette:
      primary: "#1F6FEB"
      secondary: "#0C2D6B"
      accent: "#14B8A6"
      success: "#16A34A"
      warning: "#F59E0B"
      danger: "#DC2626"
      neutral: { 50: "#F8FAFC", 900: "#0F172A" }
    semantics:
      buttonPrimaryBg: "var(--color-primary)"
      bannerInfoBg: "#E0F2FE"
  typography:
    fontPrimary: "Inter"
    fontSecondary: "Source Sans"
    headingScale: "1.250"
    numeralStyle: "lining"
  layout:
    radius: "8px"
    shadow: "sm"
    density: "comfortable" # compact|comfortable|spacious
  wording:
    productName: "Acme Control Plane"
    featureLabels:
      incidents: "Events"
    locales:
      en-US: { welcome: "Welcome" }
      fr-FR: { welcome: "Bienvenue" }
  domain:
    appHost: app.acme.com
    emailSender: notify@acme.com
  communications:
    emails:
      passwordResetTemplate: "tmpl://acme/password-reset@2"
      weeklyDigestTemplate: "tmpl://acme/digest@4"
    sms:
      otp: "tmpl://acme/sms-otp@1"
  accessibility:
    minContrastRatio: 4.5
    reduceMotionDefault: true
  compliance:
    watermarkLevel: "off"
    legalFooter: "© Acme Corp"
  guardrails:
    forbiddenOverrides:
      - security.session.minTtl
      - auth.mfa.required
    allowlistedRuntimeOverrides:
      - wording.featureLabels
```

```yaml
apiVersion: companyos.io/v1
kind: ConfigProfile
metadata:
  id: profile-uuid
  name: "EU Financial High Risk"
  version: 3.1.0
  owner: partner:acme
  scope: tenant
  inheritsFrom: profile-baseline-eu
spec:
  industry: finance
  region: eu
  riskPosture: high
  policies:
    - policy/baseline@1.3.0
    - policy/pci@2.0.1
    - policy/gdpr@1.4.2
  auth:
    mfa: required
    sessionTtlMinutes: { min: 15, default: 45 }
    sso: { saml: true, oidc: true, fido2: preferred }
    ipRestrictions: { cidrs: ["203.0.113.0/24"], mode: allow }
  dataResidency:
    regions: ["eu-central-1", "eu-west-1"]
    encryption: { atRest: "aws:kms", inTransit: "tls1.3" }
  audit:
    retentionDays: 365
    export: { allowed: true, destinations: ["s3:acme-audit-export"] }
  slo:
    services:
      console: { availability: "99.9%", latencyP99Ms: 400 }
      api: { availability: "99.95%", latencyP99Ms: 250 }
    alerting:
      errorBudgetPolicy: "standard-7d"
      pagingRules: "pagerduty://acme/security"
  features:
    enabled:
      - dashboards
      - workflow-automation
      - anomaly-detection
    disabled:
      - experimental/copilot
  dlp:
    policies:
      - dlp/pii-strict@2
    inlineMasking: true
  privacy:
    banner: { textKey: "gdpr.banner", enforcement: "blocking" }
  guardrails:
    cannotLoosen:
      - auth.mfa
      - dataResidency.regions
      - audit.retentionDays
```

## Example configuration profile (Partner "Atlas Cloud")

- **Context**: Atlas Cloud resells CompanyOS to EU fintechs. Needs strong compliance defaults, dark mode branding, and high SLO targets.

```yaml
apiVersion: companyos.io/v1
kind: Theme
metadata:
  id: theme-atlas-default
  name: "Atlas Midnight"
  version: 1.0.0
  owner: partner:atlas
  scope: partner
spec:
  identity:
    logos:
      primary: https://cdn.atlascloud.eu/branding/logo-midnight.svg
      favicon: https://cdn.atlascloud.eu/branding/favicon.ico
  colors:
    mode: auto
    palette:
      primary: "#4F46E5"
      secondary: "#312E81"
      accent: "#22D3EE"
      neutral: { 50: "#0B1220", 900: "#E5E7EB" }
    semantics:
      pageBg: "#0F172A"
      cardBg: "#111827"
  typography:
    fontPrimary: "Inter"
    fontSecondary: "Space Grotesk"
  layout:
    radius: "10px"
    density: "comfortable"
  wording:
    productName: "Atlas Control Plane"
  accessibility:
    minContrastRatio: 4.5
    reduceMotionDefault: true
  domain:
    appHost: console.atlascloud.eu
    emailSender: notify@atlascloud.eu
  communications:
    emails:
      passwordResetTemplate: "tmpl://atlas/password-reset@1"
      weeklyDigestTemplate: "tmpl://atlas/digest@1"
```

```yaml
apiVersion: companyos.io/v1
kind: ConfigProfile
metadata:
  id: profile-atlas-eu-fin-high
  name: "Atlas EU Fin High"
  version: 1.0.0
  owner: partner:atlas
  scope: tenant
spec:
  industry: finance
  region: eu
  riskPosture: high
  inheritsFrom: profile-baseline-eu
  policies:
    - policy/baseline@1.3.0
    - policy/pci@2.0.1
    - policy/gdpr@1.4.2
  auth:
    mfa: required
    sessionTtlMinutes: { min: 20, default: 45 }
    ipRestrictions: { cidrs: ["198.51.100.0/24"], mode: allow }
  dataResidency:
    regions: ["eu-central-1", "eu-west-3"]
  audit:
    retentionDays: 400
  slo:
    services:
      console: { availability: "99.95%", latencyP99Ms: 350 }
      api: { availability: "99.99%", latencyP99Ms: 200 }
    alerting:
      errorBudgetPolicy: "strict-30d"
      pagingRules: "pagerduty://atlas/security"
  features:
    enabled: ["dashboards", "workflow-automation", "anomaly-detection", "advanced-search"]
    disabled: ["experimental/copilot"]
  dlp:
    policies: ["dlp/pii-strict@2"]
    inlineMasking: true
  privacy:
    banner: { textKey: "gdpr.banner", enforcement: "blocking" }
  guardrails:
    cannotLoosen: ["auth.mfa", "audit.retentionDays"]
```

## Checklist: "White-label configuration is safe and supported if…"

- ✅ Theme and profile validate against schema and guardrails; forbidden keys not overridden.
- ✅ Assets scanned and stored in tenant/partner-isolated buckets with hashed filenames and SRI metadata.
- ✅ Domain/email ownership verified; DMARC/SPF/DKIM checks pass; CORS/ CSP updated.
- ✅ Preview reviewed with accessibility (contrast ≥4.5:1, motion-reduction respected) and screenshot diffs approved.
- ✅ Version is immutable and published with changelog, provenance (who/when/diff), and alerting rules updated.
- ✅ Edge caches warmed for target regions and locales; cache keys include environment/tenant/surface.
- ✅ Rollback target identified; prior assets retained; recovery drill completed.
- ✅ Monitoring active for theme fetch failures, cache misses, payload size regression, SLO error budgets, and template rendering errors.
- ✅ Legal/compliance strings present (privacy banner, terms links, watermark if required) and cannot be removed by tenants.
- ✅ Support playbook updated with current version IDs, known limitations, and contact paths for partner ops.

## Management & rollout lifecycle (operational playbook)

1. Partner drafts theme/profile via console or API; uploads assets → validation + security scan.
2. System generates preview build, runs accessibility + screenshot diff + contract tests for communications.
3. Partner/tenant approves preview; publish creates immutable version and triggers cache warm + release artifact.
4. Canary rollout via feature flag (percentage/ cohort); monitor metrics and error budgets.
5. Full rollout after stability window; fallback path and rollback button remain active.
6. Post-release review logs diffs, incidents, and open follow-ups; update documentation and support runbooks.

## Forward-leaning enhancements

- **Policy-aware dynamic theming**: context-aware theme variants that automatically adjust watermarking, legal notices, and contrast based on policy triggers (e.g., high-risk session, external sharing).
- **Adaptive asset delivery**: client capability detection (color-gamut, prefers-reduced-motion) to select optimal asset renditions at the CDN edge.
- **Typed SDKs + config codegen**: generate strongly-typed client/server SDKs from the schema (TS/Go/Rust) ensuring validation parity and autocomplete.
- **Signed theme bundles**: supply-chain integrity using sigstore/cosign for theme/profile artifacts; clients verify signatures before applying.
- **Observability packs**: one-click attachment of dashboards/alerts tailored to the selected profile, ensuring SLOs are monitored by default.
