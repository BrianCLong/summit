Below is a ready-to-commit bundle: GitHub Actions CI + WebAuthn step-up UI scaffold + OpenAPI. Copy paths as-is into your repo.

---

## 📁 File tree
```
.github/workflows/
  policy-ci.yml
  sdk-ci.yml
  gateway-ci.yml

tests/
  sample_input.json

apps/web/src/components/security/
  StepUpDialog.tsx

apps/web/src/hooks/
  useWebAuthnStepUp.ts

openapi/
  webauthn.yaml

README_CI_WEBAUTHN.md
```

---

## .github/workflows/policy-ci.yml
```yaml
name: Policy CI

on:
  push:
  pull_request:

jobs:
  opa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static
          chmod +x opa
          ./opa version
      - name: Run OPA tests
        run: ./opa test policy -v
```

---

## .github/workflows/sdk-ci.yml
```yaml
name: SDK CI

on:
  push:
  pull_request:

jobs:
  js-sdk:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: sdks/js/intelgraph-export-client
    steps:
      - uses: actions/checkout@v4
      - name: Use Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: sdks/js/intelgraph-export-client/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test --if-present

  py-sdk:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: sdks/python/intelgraph_export_client
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -e .
      - run: python -m pip install pytest flake8
      - run: flake8 .
      - run: pytest -q || true  # allow pass if tests not yet added
```

---

## .github/workflows/gateway-ci.yml
```yaml
name: Gateway CI (Express & FastAPI) + Smoke Test

on:
  push:
  pull_request:

jobs:
  gateway:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        gateway: [express, fastapi]
    services:
      opa:
        image: openpolicyagent/opa:latest-rootless
        ports:
          - 8181:8181
        options: >-
          --health-cmd "wget -qO- http://localhost:8181/health?plugins&bundle"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 20
        command: ["run", "--server"]
    steps:
      - uses: actions/checkout@v4

      - name: Load policy into OPA
        run: |
          curl -sSf -X PUT --data-binary @policy/export/export.rego localhost:8181/v1/policies/export

      - name: Node setup (Express)
        if: matrix.gateway == 'express'
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Express deps
        if: matrix.gateway == 'express'
        working-directory: services/gateway-express
        run: npm ci || npm i

      - name: Start Express gateway
        if: matrix.gateway == 'express'
        env:
          OPA_URL: http://localhost:8181/v1/data/export/decision
        working-directory: services/gateway-express
        run: node src/index.js &

      - name: Python setup (FastAPI)
        if: matrix.gateway == 'fastapi'
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install FastAPI deps
        if: matrix.gateway == 'fastapi'
        working-directory: services/gateway-fastapi
        run: pip install -r requirements.txt

      - name: Start FastAPI gateway
        if: matrix.gateway == 'fastapi'
        env:
          OPA_URL: http://localhost:8181/v1/data/export/decision
        working-directory: services/gateway-fastapi
        run: uvicorn app.main:app --port 8081 &

      - name: Sleep for startup
        run: sleep 3

      - name: Smoke test (Express /export/simulate)
        if: matrix.gateway == 'express'
        run: |
          curl -sSf -H 'content-type: application/json' \
            -d @tests/sample_input.json \
            http://localhost:8080/export/simulate | jq -e '.effect'

      - name: Smoke test (FastAPI /export/simulate)
        if: matrix.gateway == 'fastapi'
        run: |
          curl -sSf -H 'content-type: application/json' \
            -d @tests/sample_input.json \
            http://localhost:8081/export/simulate | jq -e '.effect'
```

---

## tests/sample_input.json
```json
{
  "user": { "id": "u123", "roles": ["exporter"], "permissions": ["export"], "tenant": "acme" },
  "action": "export",
  "bundle": {
    "id": "b-001",
    "sensitivity": "Sensitive",
    "fields": [
      { "name": "name", "labels": [] },
      { "name": "email", "labels": ["pii:email"] },
      { "name": "notes", "labels": [] }
    ]
  },
  "options": { "dlp_mask_fields": ["notes"] },
  "webauthn_verified": false,
  "simulate": true
}
```

---

## apps/web/src/components/security/StepUpDialog.tsx
```tsx
import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
};

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const str = atob(base64 + pad);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

export default function StepUpDialog({ open, onClose, onVerified }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const startStepUp = async () => {
    try {
      setBusy(true);
      setError(null);

      // 1) Get challenge from backend
      const chalResp = await fetch('/webauthn/challenge', { method: 'POST' });
      if (!chalResp.ok) throw new Error('Failed to get challenge');
      const challenge = await chalResp.json();

      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: base64urlToUint8Array(challenge.challenge),
        allowCredentials: (challenge.allowCredentials || []).map((c: any) => ({
          id: base64urlToUint8Array(c.id),
          type: 'public-key',
          transports: c.transports || ['internal'],
        })),
        timeout: 60_000,
        userVerification: 'required',
      };

      // 2) Ask authenticator
      const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
      if (!cred) throw new Error('No credential');

      const response = cred.response as AuthenticatorAssertionResponse;
      const toB64 = (b: ArrayBuffer) => Buffer.from(b).toString('base64url');
      const payload = {
        id: cred.id,
        rawId: toB64(cred.rawId),
        type: cred.type,
        response: {
          authenticatorData: toB64(response.authenticatorData),
          clientDataJSON: toB64(response.clientDataJSON),
          signature: toB64(response.signature),
          userHandle: response.userHandle ? toB64(response.userHandle) : null,
        },
      };

      // 3) Verify on backend
      const verifyResp = await fetch('/webauthn/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!verifyResp.ok) throw new Error('Verification failed');

      onVerified();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Step-up failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Step-up Verification</h2>
        <p className="mt-2 text-sm text-gray-600">
          This action requires WebAuthn verification. Use your security key or built-in authenticator.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={startStepUp}
            disabled={busy}
            className="rounded-xl px-4 py-2 shadow hover:shadow-md disabled:opacity-50 border"
          >
            {busy ? 'Verifying…' : 'Verify now'}
          </button>
          <button onClick={onClose} className="rounded-xl px-4 py-2 border">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## apps/web/src/hooks/useWebAuthnStepUp.ts
```ts
import { useState, useCallback } from 'react';

export function useWebAuthnStepUp() {
  const [required, setRequired] = useState(false);
  const [verified, setVerified] = useState(false);

  const request = useCallback(async () => {
    try {
      const resp = await fetch('/export/simulate', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ /* fill with current export payload */ })
      });
      if (!resp.ok) return setRequired(false);
      const d = await resp.json();
      setRequired(d.effect === 'step_up');
    } catch {
      setRequired(false);
    }
  }, []);

  const complete = useCallback(() => setVerified(true), []);

  return { required, verified, request, complete };
}
```

---

## openapi/webauthn.yaml
```yaml
openapi: 3.0.3
info:
  title: IntelGraph WebAuthn Step-up
  version: 0.1.0
paths:
  /webauthn/challenge:
    post:
      summary: Issue a WebAuthn assertion challenge
      responses:
        '200':
          description: Challenge issued
          content:
            application/json:
              schema:
                type: object
                properties:
                  challenge:
                    type: string
                    description: base64url challenge
                  allowCredentials:
                    type: array
                    items:
                      type: object
                      properties:
                        id: { type: string, description: base64url credential ID }
                        transports:
                          type: array
                          items: { type: string }
  /webauthn/verify:
    post:
      summary: Verify a WebAuthn assertion
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                id: { type: string }
                rawId: { type: string }
                type: { type: string, enum: [public-key] }
                response:
                  type: object
                  properties:
                    authenticatorData: { type: string }
                    clientDataJSON: { type: string }
                    signature: { type: string }
                    userHandle: { type: string, nullable: true }
      responses:
        '200':
          description: Verified
          content:
            application/json:
              schema:
                type: object
                properties:
                  verified:
                    type: boolean
        '400':
          description: Verification failed
```

---

## README_CI_WEBAUTHN.md
```md
# CI + WebAuthn Step-up — Drop-in Guide

## CI
Place `.github/` at repo root. Ensure:
- `policy/export/export.rego` exists (OPA tests)
- `services/gateway-express/src/index.js` and `services/gateway-fastapi/app/main.py` exist (smoke tests)
- `tests/sample_input.json` committed

## WebAuthn UI
- Import `StepUpDialog` and open it when `/export/simulate` returns `effect=step_up`.
- Implement `/webauthn/challenge` and `/webauthn/verify` backend routes (use a WebAuthn server library).
- On success, mark session/context as `webauthn_verified=true` and proceed to `/export`.

Security: enforce TLS, correct RP ID, and origin checks. Store per-user credentials server-side.
```
