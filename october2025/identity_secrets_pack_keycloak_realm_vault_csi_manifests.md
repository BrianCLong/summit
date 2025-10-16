# Identity & Secrets Pack — Keycloak Realm + Vault CSI Manifests

> Drop‑in identity (OIDC) and secrets plumbing for the **Unification Release**. Includes a production‑ready **Keycloak realm export**, client roles/scopes/mappers, WebAuthn step‑up policy, and **Vault CSI SecretProviderClass** manifests with Vault policy/role setup helpers. Also adds gateway/webapp env wiring and import scripts.

---

## 0) Repo Layout

```
intelgraph/
├─ keycloak/
│  ├─ realm-intelgraph.json           # Full realm export (prod-ready defaults)
│  ├─ import-realm.sh                 # kcadm import script
│  ├─ create-service-account.sh       # helper for client secret + roles
│  └─ README.md
└─ deploy/vault-csi/
   ├─ secretproviderclass-intelgraph.yaml  # Vault CSI SecretProviderClass (neo4j, pg, minio)
   ├─ serviceaccount-intelgraph.yaml       # SA for pods to access Vault via k8s auth
   ├─ vault-auth-setup.md                  # Vault policy + role guide (CLI)
   └─ examples-pod-annotations.md          # Pod spec snippets to mount secrets
```

---

## 1) Keycloak Realm Export (production‑flavored)

```json
// keycloak/realm-intelgraph.json
{
  "realm": "intelgraph",
  "enabled": true,
  "displayName": "IntelGraph",
  "loginWithEmailAllowed": true,
  "registrationAllowed": false,
  "resetPasswordAllowed": true,
  "bruteForceProtected": true,
  "failureFactor": 5,
  "waitIncrementSeconds": 60,
  "maxFailureWaitSeconds": 900,
  "permanentLockout": false,
  "sslRequired": "external",
  "accessTokenLifespan": 900,
  "accessTokenLifespanForImplicitFlow": 600,
  "ssoSessionIdleTimeout": 28800,
  "webAuthnPolicy": {
    "relyingPartyEntityName": "IntelGraph",
    "relyingPartyId": "intelgraph.local",
    "signatureAlgorithms": ["ES256"],
    "attestationConveyancePreference": "none",
    "authenticatorAttachment": "platform",
    "requireResidentKey": "not specified",
    "userVerificationRequirement": "required"
  },
  "roles": {
    "realm": [
      { "name": "admin" },
      { "name": "analyst" },
      { "name": "auditor" },
      { "name": "service" }
    ]
  },
  "groups": [
    { "name": "pilot", "attributes": { "tenant": ["pilot"] } },
    { "name": "internal", "attributes": { "tenant": ["intelgraph"] } }
  ],
  "clients": [
    {
      "clientId": "intelgraph-web",
      "protocol": "openid-connect",
      "publicClient": true,
      "redirectUris": [
        "https://*.intelgraph.local/*",
        "http://localhost:5173/*"
      ],
      "webOrigins": ["+"]
    },
    {
      "clientId": "intelgraph-api",
      "protocol": "openid-connect",
      "serviceAccountsEnabled": true,
      "publicClient": false,
      "standardFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "redirectUris": [],
      "defaultClientScopes": ["roles", "profile", "email", "tenant"],
      "optionalClientScopes": ["acr"]
    }
  ],
  "clientScopes": [
    {
      "name": "tenant",
      "protocol": "openid-connect",
      "protocolMappers": [
        {
          "name": "tenant-attr",
          "protocol": "openid-connect",
          "protocolMapper": "oidc-usermodel-attribute-mapper",
          "consentRequired": false,
          "config": {
            "user.attribute": "tenant",
            "id.token.claim": "true",
            "access.token.claim": "true",
            "claim.name": "tnt",
            "jsonType.label": "String"
          }
        }
      ]
    },
    {
      "name": "acr",
      "protocol": "openid-connect",
      "protocolMappers": [
        {
          "name": "acr-level",
          "protocol": "openid-connect",
          "protocolMapper": "oidc-acr-mapper",
          "consentRequired": false,
          "config": { "id.token.claim": "true", "access.token.claim": "true" }
        }
      ]
    }
  ],
  "defaultDefaultClientScopes": ["tenant", "roles", "profile", "email"],
  "users": [
    {
      "username": "lead",
      "enabled": true,
      "emailVerified": true,
      "email": "lead@example.com",
      "firstName": "Lead",
      "lastName": "Analyst",
      "attributes": { "tenant": ["pilot"] },
      "credentials": [
        { "type": "password", "value": "ChangeMe!123", "temporary": true }
      ],
      "realmRoles": ["analyst"]
    }
  ],
  "eventsEnabled": true,
  "eventsListeners": ["jboss-logging"],
  "internationalizationEnabled": true,
  "supportedLocales": ["en"],
  "defaultLocale": "en"
}
```

---

## 2) Keycloak Import & Service Account Scripts

```bash
# keycloak/import-realm.sh
set -euo pipefail
KC_URL=${KC_URL:-"https://keycloak"}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-admin}
REALM="intelgraph"

kcadm.sh config credentials --server "$KC_URL" --realm master --user "$ADMIN_USER" --password "$ADMIN_PASS"
# Create or update realm
kcadm.sh create realms -f realm-intelgraph.json || \
  kcadm.sh update realms/$REALM -f realm-intelgraph.json

echo "Realm $REALM imported/updated."
```

```bash
# keycloak/create-service-account.sh
set -euo pipefail
KC_URL=${KC_URL:-"https://keycloak"}
CLIENT_ID=${CLIENT_ID:-intelgraph-api}
REALM=${REALM:-intelgraph}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-admin}

kcadm.sh config credentials --server "$KC_URL" --realm master --user "$ADMIN_USER" --password "$ADMIN_PASS"
CID=$(kcadm.sh get clients -r $REALM -q clientId=$CLIENT_ID | jq -r '.[0].id')
# Get client secret
kcadm.sh get clients/$CID/client-secret -r $REALM | tee client-secret.json
# Grant service roles
SID=$(kcadm.sh get clients/$CID/service-account-user -r $REALM | jq -r '.id')
kcadm.sh add-roles -r $REALM --uusername $(kcadm.sh get users/$SID -r $REALM | jq -r '.username') --rolename service
```

---

## 3) Gateway/Webapp Environment Wiring

```env
# gateway .env (rendered by tools/config/render.ts)
KEYCLOAK_ISSUER=https://keycloak/auth/realms/intelgraph
KEYCLOAK_AUDIENCE=intelgraph-api
OPA_URL=http://opa:8181
```

```ts
// gateway usage reminder
import { getContext } from './auth';
startStandaloneServer(server, { context: getContext });
```

Webapp uses the **public** client `intelgraph-web`. Configure your SPA origin in the realm’s client `redirectUris`/`webOrigins`.

---

## 4) Vault CSI — SecretProviderClass & Pod Wiring

```yaml
# deploy/vault-csi/secretproviderclass-intelgraph.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: intelgraph-vault
  namespace: intelgraph
spec:
  provider: vault
  parameters:
    roleName: intelgraph-app
    vaultAddress: 'https://vault.vault.svc:8200'
    objects: |
      - objectName: neo4j-pass
        secretPath: secret/data/intelgraph/neo4j
        secretKey: password
      - objectName: postgres-url
        secretPath: secret/data/intelgraph/postgres
        secretKey: url
      - objectName: minio-key
        secretPath: secret/data/intelgraph/minio
        secretKey: key
      - objectName: minio-secret
        secretPath: secret/data/intelgraph/minio
        secretKey: secret
    # Optional: TLS config if Vault uses custom CAs
    # caBundle: |
    #   -----BEGIN CERTIFICATE-----
    #   ...
    #   -----END CERTIFICATE-----
  secretObjects:
    - secretName: intelgraph-secrets
      type: Opaque
      data:
        - objectName: neo4j-pass
          key: NEO4J_PASS
        - objectName: postgres-url
          key: POSTGRES_URL
        - objectName: minio-key
          key: S3_KEY
        - objectName: minio-secret
          key: S3_SECRET
```

```yaml
# deploy/vault-csi/serviceaccount-intelgraph.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: intelgraph-app
  namespace: intelgraph
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: intelgraph-secrets-reader
  namespace: intelgraph
rules:
  - apiGroups: ['']
    resources: ['secrets']
    verbs: ['get']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: intelgraph-secrets-reader
  namespace: intelgraph
subjects:
  - kind: ServiceAccount
    name: intelgraph-app
    namespace: intelgraph
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: intelgraph-secrets-reader
```

```md
# deploy/vault-csi/examples-pod-annotations.md

# Example (gateway) pod template fragment

serviceAccountName: intelgraph-app
volumes:

- name: vault-secrets
  csi:
  driver: secrets-store.csi.k8s.io
  readOnly: true
  volumeAttributes:
  secretProviderClass: intelgraph-vault
  containers:
- name: gateway
  env:
  - name: NEO4J_PASS
    valueFrom:
    secretKeyRef: { name: intelgraph-secrets, key: NEO4J_PASS }
  - name: POSTGRES_URL
    valueFrom:
    secretKeyRef: { name: intelgraph-secrets, key: POSTGRES_URL }
  - name: S3_KEY
    valueFrom:
    secretKeyRef: { name: intelgraph-secrets, key: S3_KEY }
  - name: S3_SECRET
    valueFrom:
    secretKeyRef: { name: intelgraph-secrets, key: S3_SECRET }
    volumeMounts:
  - name: vault-secrets
    mountPath: /mnt/secrets
    readOnly: true
```

---

## 5) Vault Setup Guide (CLI)

```md
# deploy/vault-csi/vault-auth-setup.md

1. Enable k8s auth:
   vault auth enable kubernetes
2. Configure k8s auth with your cluster JWT & CA:
   vault write auth/kubernetes/config kubernetes_host="$K8S_HOST" kubernetes_ca_cert=@/path/ca.crt token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
3. Create policy:
   cat > policy-intelgraph.hcl <<'HCL'
   path "secret/data/intelgraph/\*" { capabilities = ["read"] }
   HCL
   vault policy write intelgraph policy-intelgraph.hcl
4. Create role:
   vault write auth/kubernetes/role/intelgraph-app \
    bound_service_account_names=intelgraph-app \
    bound_service_account_namespaces=intelgraph \
    policies=intelgraph ttl=24h
5. Put secrets:
   vault kv put secret/intelgraph/neo4j password=REDACTED
   vault kv put secret/intelgraph/postgres url=postgres://user:pass@postgres:5432/intelgraph
   vault kv put secret/intelgraph/minio key=REDACTED secret=REDACTED
```

---

## 6) Helm Integration Snippets

```yaml
# values.yaml additions
serviceAccount:
  name: intelgraph-app
csi:
  secretProviderClass: intelgraph-vault

# deployment template patches (example)
spec:
  serviceAccountName: { { .Values.serviceAccount.name } }
  volumes:
    - name: vault-secrets
      csi:
        driver: secrets-store.csi.k8s.io
        volumeAttributes:
          secretProviderClass: { { .Values.csi.secretProviderClass } }
  containers:
    - name: gateway
      envFrom:
        - secretRef: { name: intelgraph-secrets }
      volumeMounts:
        - name: vault-secrets
          mountPath: /mnt/secrets
          readOnly: true
```

---

## 7) Verification

- **OIDC**: call `/.well-known/openid-configuration` at `${KEYCLOAK_ISSUER}`; ensure `jwks_uri` reachable from gateway.
- **Token**: mint client‑credentials on `intelgraph-api` and hit `/graphql { __typename }` with `Authorization: Bearer`.
- **CSI**: verify `intelgraph-secrets` generated and pods receive envs; rotate secrets in Vault and confirm hot reload via restart.

---

## 8) Notes & Defaults

- Default password for user `lead` is temporary — Keycloak forces reset on first login.
- WebAuthn requires HTTPS/origin; for local, use `localhost` with flags or dev certificates.
- Adjust token lifespans per security posture; set `acr` requirements on EXPORT routes in gateway.
- For multi‑tenant, prefer **group attributes** (`tenant`) over per‑user attributes to simplify management.

```

```
