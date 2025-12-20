# AcmeCloud RevOps end-to-end scenario

This scenario traces a single AcmeCloud enterprise deal from inbound lead through provisioning. It pairs the tenant’s config with the OPA policies, graph/evidence updates, and the Switchboard surfaces an operator sees at each hop.

---

## 1) Tenant configuration (inputs to OPA)

### Discount guardrails — `config/tenants/acmecloud/revops/discounts.yaml`

| Segment | AE max | Sales mgr max | VP sales max | Approval thresholds |
| --- | --- | --- | --- | --- |
| `smb` | 15% | 25% | 35% | 15% (none), 25% (sales_manager), 35% (sales_manager, finance) |
| `enterprise` | 10% | 20% | 30% | 10% (none), 20% (sales_manager), 30% (sales_manager, finance, vp_sales) |

- Global ceiling: `max_discount_any_deal = 45%`.
- Non-standard terms append `legal` to the approval chain.

### Lead routing — `config/tenants/acmecloud/revops/routing.yaml`

- `smb`: round-robin → team `sdr_smb`, SLA first touch in 4h.
- `enterprise`: territory-based: EU → `ae_enterprise_eu`, NA → `ae_enterprise_na`; SLA first touch in 2h.
- Blocklist domains: `spam.com`, `test.com` (auto-rejected upstream of routing policy).

### Quick policy wiring (Rego sketch)

```rego
package revops.lead_routing

segment := seg {
  seg := segments.segment_for_lead(input.lead)
}

assignee := {"type": "team", "id": team} {
  seg := segment
  team := config.tenant[input.tenant.id].lead_routing[seg].territories.eu.team
  input.lead.country == "DE"
}
```

The policies read tenant config via `data.revops.config.tenant["acmecloud"]` and emit receipts tagged with the bundle and config versions.

---

## 2) Step 1 — inbound lead routing

**Input**
```json
{
  "lead": {
    "id": "lead-1001",
    "email": "cto@megaeu.com",
    "domain": "megaeu.com",
    "company_size": "1000+",
    "industry": "SaaS",
    "country": "DE",
    "segment_hint": "enterprise"
  },
  "account": null,
  "tenant": { "id": "acmecloud" },
  "context": { "source": "web_form", "received_at": "2025-02-01T09:00:00Z" }
}
```

**Policy path**: `revops.lead_routing.decision`

- Segment resolution: `segment_for_lead` → **enterprise** (1000+ employees wins over hint).
- Territory mapping: country `DE` → EU → team **`ae_enterprise_eu`**.
- SLA: 2h first touch from config.

**Decision**
```json
{
  "allowed": true,
  "reason": "ok",
  "assignee": { "type": "team", "id": "ae_enterprise_eu" },
  "sla": { "first_touch_hours": 2 },
  "segment": "enterprise",
  "flags": []
}
```

**Graph + evidence updates**
- Nodes: `Lead(lead-1001)`, `Tenant(acmecloud)`, `Team(ae_enterprise_eu)`, `PolicyDecision(poldec-lead-1001-routing)`, `Receipt(receipt-lead-1001-routing)`.
- Edges: Lead → Tenant (BELONGS_TO), Lead → Team (ROUTED_TO), Lead → PolicyDecision (HAS_POLICY_DECISION), PolicyDecision → Receipt (EVIDENCED_BY).
- UI: list “New Enterprise Leads – EU” shows `lead-1001`; graph pane shows Lead ↔ Tenant ↔ Team with PolicyDecision; timeline shows `Lead created` and `Lead routed` with SLA 2h.

---

## 3) Step 2 — quote discount & approvals

**Opportunity context**
- AE on `ae_enterprise_eu` opens `Account(megaeu)` and `Opportunity(opp-5001)` (ARR target $240k).
- `Quote(quote-9001)` at **30% discount** with non-standard terms.

**Input to `revops.discount.decision`**
```json
{
  "quote": {
    "id": "quote-9001",
    "segment": "enterprise",
    "arr": 240000,
    "list_price_total": 343000,
    "discount_percentage": 30,
    "term_length_months": 24,
    "has_non_standard_terms": true
  },
  "subject": {
    "id": "user-ae-123",
    "role": "ae",
    "level": "IC",
    "segment_permissions": ["enterprise"]
  },
  "account": {
    "id": "account-megaeu",
    "customer_type": "new",
    "risk_score": 3
  },
  "tenant": { "id": "acmecloud" }
}
```

**Evaluation**
- Personal max for enterprise AE = **10%** → subject is over limit.
- Discount 30% hits top tier → approvals: `sales_manager`, `finance`, `vp_sales`; non-standard terms add `legal`.
- Within global ceiling (30% ≤ 45%) so allowed if approvals complete.

**Decision**
```json
{
  "allowed": true,
  "reason": "over_subject_max_requires_full_chain",
  "required_approvals": [
    "sales_manager",
    "finance",
    "vp_sales",
    "legal"
  ],
  "max_discount_allowed": 10,
  "flags": [
    "over_subject_max",
    "high_discount_enterprise",
    "non_standard_terms"
  ]
}
```

**Workflow & evidence**
- Creates `Approval` nodes (one per role) and sets `Quote.status = "pending_approval"`.
- PolicyDecision + Receipt persist bundle/config versions for audit; each approval update emits its own Receipt.
- UI: Sales Manager sees “Enterprise deal, $240k ARR, 30% discount” in **My Approvals**; policy tab calls out AE max (10%), requested discount (30%), and required approvers.

---

## 4) Step 3 — contract signature & activation

**Contract lifecycle**
- CLM generates `Contract(contract-7001)` from the quote and sends via DocuSign (or similar).
- Statuses emit receipts and connect Quote → Contract: `sent` → `signed` (with signer identities/hashes).

**Input to `revops.contract_activation.decision`**
```json
{
  "contract": {
    "id": "contract-7001",
    "status": "signed",
    "segment": "enterprise",
    "jurisdiction": "DE",
    "has_non_standard_terms": true,
    "signers": [
      { "email": "cto@megaeu.com", "role": "C-level" }
    ]
  },
  "quote": {
    "id": "quote-9001",
    "discount_percentage": 30,
    "segment": "enterprise"
  },
  "approvals": [
    "sales_manager", "finance", "vp_sales", "legal"
  ],
  "tenant": { "id": "acmecloud" }
}
```

**Evaluation**
- Invariants: `status == signed`; discount 30% ≤ global 45%.
- Enterprise + non-standard terms + >20% require finance + VP Sales + legal approvals → satisfied.
- Jurisdiction DE allowed.

**Decision**
```json
{
  "allowed": true,
  "reason": "all_required_approvals_present_and_terms_allowed",
  "flags": ["non_standard_terms_with_full_approvals"]
}
```

**Downstream actions**
- Create `Subscription(sub-5501)` and `Order(order-8201)`; trigger provisioning adapter.
- Each adapter call emits receipts and links back to Contract/Quote/Opportunity/Tenant for traceability.

---

## 5) Graph snapshot (deal subgraph)

```
Lead(lead-1001) --BELONGS_TO--> Tenant(acmecloud)
   |--ROUTED_TO--> Team(ae_enterprise_eu)
   |--HAS_POLICY_DECISION--> PolicyDecision(poldec-lead-1001-routing) --EVIDENCED_BY--> Receipt(...)
   |
Account(megaeu) --OPENS--> Opportunity(opp-5001) --HAS_QUOTE--> Quote(quote-9001)
   |                                                          |
   |                                                          |--HAS_POLICY_DECISION--> PolicyDecision(poldec-quote-9001-discount)
   |                                                          |--HAS_CONTRACT--> Contract(contract-7001) --HAS_POLICY_DECISION--> PolicyDecision(poldec-contract-7001-activation)
   |                                                                                                   |--EVIDENCED_BY--> Receipt(...)
   |--APPROVALS--> Approval(sales_manager|finance|vp_sales|legal)
```

---

## 6) Timeline (UTC)

| Time | Event |
| --- | --- |
| 09:00 | Lead created & routed (enterprise, EU team, SLA 2h) |
| 09:30 | Opportunity + initial quote drafted |
| 10:15 | Quote updated to 30% discount, submitted for approval |
| 10:30–12:00 | Sales Manager → Finance → VP Sales → Legal approvals completed (each with receipts) |
| 12:30 | Contract generated & sent for signature |
| 14:00 | Contract signed (signer identity captured) |
| 14:15 | Contract activation decision allowed |
| 14:16 | Subscription created; provisioning kicked off |

---

## 7) Evidence bundle contents (exportable)

- **Manifest**: IDs, timestamps, tenant, policy bundle version, tenant config version.
- **Lead routing**: policy input, decision JSON, SLA timer evidence.
- **Discount + approvals**: quote versions, PolicyDecision JSON, approval trail (who/when/rationale), subject max vs requested.
- **Contract**: CLM metadata (hashes, signer identities), signature events, activation decision.
- **Provisioning/billing**: subscription/order creation receipts, retries/rollbacks if any.

---

## 8) Dashboard impacts (Q1 2025, enterprise/EU filter)

- Routing SLA: met (responded within 2h).
- Discounts: counted in “30%+ enterprise discounts” and “requires full approval chain”.
- Approvals: latency measured from `pending_approval` → final approval; contributes to approval-time distribution.
- Revenue controls: increments “non-standard terms >20% with approvals” KPI; visible in RevOps governance panels.

