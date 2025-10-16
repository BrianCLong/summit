# Export Policy — Decision Contract

**Endpoint pairing**

- `POST /export/simulate` → returns decision payload (never blocks IO)
- `POST /export` → enforces policy (may deny if step-up missing)

**Request (example)**

```json
{
  "mode": "simulate",
  "action": "export",
  "auth": { "actor": "user-123", "webauthn_verified": true },
  "resource": {
    "sensitivity": "Sensitive",
    "fields": [
      { "path": "person.ssn", "tags": ["pii:ssn"] },
      { "path": "email", "tags": ["pii:email"] }
    ],
    "explicit_dlp_mask_paths": ["credit_card.number"]
  }
}
```

**Response**

```json
{
  "mode": "simulate",
  "allow": true,
  "redactions": [
    { "path": "person.ssn", "reason": "pii:ssn" },
    { "path": "email", "reason": "pii:email" },
    { "path": "credit_card.number", "reason": "explicit" }
  ],
  "step_up": { "required": true, "satisfied": true },
  "reasons": ["step-up required for sensitivity=Sensitive"]
}
```

**Rollout**: enable **simulate** for first 48h; toggle **enforce** thereafter.
