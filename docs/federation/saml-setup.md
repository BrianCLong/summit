# Federated Identity Setup (SAML 2.0)

This guide walks through enabling SAML 2.0 federation for the Summit platform alongside the existing OIDC/JWT pipeline. It covers identity provider (IdP) onboarding, role mapping, deployment configuration, policy enforcement, and validation steps.

## 1. Prerequisites

- An IdP that supports SAML 2.0 (e.g., OneLogin, Azure AD, Okta).
- Exported IdP signing certificate in PEM format.
- Summit server v24.0.0+ with the federated identity middleware (this change set).
- Access to the Summit Helm deployment and secrets management (Kubernetes cluster admin or DevOps).
- Knowledge of tenant/org/team attribute naming inside IdP assertions if tenant scoping is required.

## 2. Collect IdP Metadata

From the IdP administrative console gather:

| Required Information | Purpose |
| -------------------- | ------- |
| Entity ID            | Mapped to `SAML_IDP_ENTITY_ID` for audience validation. |
| SSO URL / ACS URL    | Stored as `SAML_IDP_SSO_URL` for reference and health checks. |
| Signing certificate  | Uploaded to the `saml-idp-cert` Kubernetes secret so assertions can be validated. |
| Attribute mappings   | Identify which SAML attributes contain email, tenant, org/team identifiers, and group/role membership. |

## 3. Configure Summit Helm Values

Update your environment overrides (e.g., `values-prod.yaml`) or use the default chart values to enable SAML:

```yaml
env:
  - name: SAML_ENABLED
    value: 'true'
  - name: SAML_IDP_ENTITY_ID
    value: 'https://app.onelogin.com/saml/metadata/12345'
  - name: SAML_IDP_SSO_URL
    value: 'https://onelogin.example.com/trust/saml2/http-post/sso/12345'
  - name: SAML_SP_ENTITY_ID
    value: 'urn:intelgraph:api'
  - name: SAML_SP_ASSERTION_CONSUMER_SERVICE_URL
    value: 'https://api.example.com/saml/acs'
  - name: SAML_AUDIENCE
    value: 'urn:intelgraph:api'
  - name: SAML_ROLE_ATTRIBUTE
    value: 'http://schemas.xmlsoap.org/claims/Group'
  - name: SAML_ROLE_MAPPINGS
    value: 'OneLogin_Admin=ADMIN,OneLogin_Analyst=ANALYST,OneLogin_Viewer=VIEWER'
  - name: SAML_DEFAULT_ROLE
    value: 'VIEWER'
  - name: SAML_REQUIRE_SIGNED_ASSERTIONS
    value: 'true'
  - name: SAML_CLOCK_TOLERANCE_SECONDS
    value: '180'
```

> **Tip:** You can specify multiple mappings by separating them with commas (`group=ROLE`). All roles are normalized to uppercase before being applied.

## 4. Manage Secrets

Create or update a Kubernetes secret that stores the IdP signing certificate. The Helm chart expects a secret named `saml-idp-cert` with a `certificate` key:

```bash
kubectl create secret generic saml-idp-cert \
  --from-file=certificate=./onelogin-signing.pem \
  --namespace summit
```

If you use an external secret manager (e.g., External Secrets Operator), align the secret name/key with the chart expectation or update the template accordingly.

## 5. Role Mapping and RBAC

- SAML groups are mapped to Summit RBAC roles using `SAML_ROLE_MAPPINGS`.
- Any unmapped group falls back to `SAML_DEFAULT_ROLE`.
- The middleware populates both `req.user.role` (primary role) and `req.user.roles` (all mapped roles) so downstream services and OPA policies can enforce fine-grained permissions.
- API key and OIDC/JWT flows continue to operate in parallel with explicit `identityProvider` markers (`api-key`, `oidc`, `saml`).

## 6. OPA Policy Enforcement

OPA policies (`server/policies/intelgraph.rego`) now include federated identity guards:

- Requests must originate from an allowed identity provider unless explicitly overridden.
- Services may set `requiredIdentityProviders` in the OPA input context to lock down endpoints to SAML-only or OIDC-only flows.
- System/service actors without an identity provider must use the `system` role to bypass federated checks.

## 7. Validate the Deployment

1. **Run unit and policy tests locally**
   ```bash
   cd server
   npm test -- federated-auth.e2e.test.ts
   npm run opa:test   # if you maintain an OPA test script
   opa test policies
   ```
2. **Smoke test via API** – send a SAML assertion to a protected endpoint (e.g., `/api/graph`) using the `Authorization: SAML <base64-assertion>` header or `X-SAML-Assertion`.
3. **Observe logs** – the middleware logs rejected assertions with reason codes (`component: auth-middleware`).
4. **Grafana/metrics** – confirm `X-Auth-Method` headers in access logs include `saml` for federated calls.

## 8. Troubleshooting

| Symptom | Resolution |
| ------- | ---------- |
| `401 Unauthorized` with reason `saml-assertion-invalid` | Verify the assertion audience, expiration timestamps, and signature (if required). |
| OPA denies access with `identity_provider` rule | Ensure the request context includes `identityProvider` (automatically set by the middleware) and that the provider is listed in `allowed_identity_providers` or `requiredIdentityProviders`. |
| Role mismatch | Confirm the SAML group values exactly match keys in `SAML_ROLE_MAPPINGS`. Remember they are case-sensitive before normalization. |
| Clock skew errors | Adjust `SAML_CLOCK_TOLERANCE_SECONDS` to account for IdP/server drift. |

## 9. Next Steps

- Configure SCIM provisioning to keep Summit users and groups in sync with the IdP.
- Enable step-up or MFA policies at the IdP for sensitive Summit roles (`ADMIN`, `ANALYST`).
- Periodically rotate the IdP certificate and update the `saml-idp-cert` secret to maintain trust.

With these steps complete, Summit accepts federated SAML identities, maps them to RBAC roles, and enforces provider-specific policies across the platform.
