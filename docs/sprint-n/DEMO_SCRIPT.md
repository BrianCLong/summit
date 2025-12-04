# Design Partner Demo Script

## Sprint N "Provable Value Slice"

**Duration:** 15-20 minutes
**Audience:** Design Partners, Potential Customers
**Version:** 1.0.0

---

## Pre-Demo Checklist

- [ ] Decision API service running (`localhost:4020`)
- [ ] Sample data seeded (entities, claims, evidence)
- [ ] Demo tenant configured
- [ ] Browser tabs ready for API/UI
- [ ] Disclosure pack example generated

---

## Demo Flow

### Opening (2 minutes)

**Talking Points:**

> "Today I'm going to show you how IntelGraph helps you make better decisions with full provenance.
>
> The core problem we're solving: When you make a critical business decision—like selecting a vendor, approving a model, or allocating resources—you need to know *why* that decision was made, *what evidence* supported it, and *who* approved it.
>
> Most organizations either have no audit trail, or have a mess of emails and documents that can't be reconstructed later.
>
> IntelGraph gives you **provable decisions**—every recommendation, every piece of evidence, every approval is tracked and can be verified."

---

### Section 1: The Problem (3 minutes)

**Scenario Setup:**

> "Let's say you're evaluating a new AI vendor for your fraud detection system. You need to decide: Do we go with Vendor A or Vendor B?
>
> Today, this process probably looks like:
> 1. Someone gathers some documents
> 2. A few people have email discussions
> 3. Eventually someone makes a call in a meeting
> 4. Six months later, when regulators ask 'why did you choose this vendor?'—good luck reconstructing that."

**Pain Points to Emphasize:**

- No clear evidence trail
- Unclear who made the decision
- Can't verify information hasn't changed
- Compliance audit nightmare

---

### Section 2: Creating the Decision Context (4 minutes)

**Live Demo: Create Entities**

```bash
# Create Vendor A
curl -X POST http://localhost:4020/api/v1/entities \
  -H "Content-Type: application/json" \
  -H "X-User-Id: demo-user" \
  -H "X-Tenant-Id: demo-tenant" \
  -d '{
    "type": "Vendor",
    "name": "SecureAI Corp",
    "description": "AI/ML vendor specializing in fraud detection",
    "attributes": {
      "founded": "2019",
      "employees": 250,
      "soc2_certified": true
    }
  }'
```

**Talking Points:**

> "First, we create entities in our graph. These are the things we're making decisions about. Each entity is tracked with full metadata."

**Live Demo: Create Claims**

```bash
# Create a claim about the vendor
curl -X POST http://localhost:4020/api/v1/claims \
  -H "Content-Type: application/json" \
  -H "X-User-Id: demo-user" \
  -H "X-Tenant-Id: demo-tenant" \
  -d '{
    "entity_id": "<ENTITY_ID>",
    "claim_type": "security_posture",
    "assertion": "SecureAI Corp maintains SOC2 Type II certification with no findings in the past 2 years",
    "confidence_score": 0.95,
    "source_type": "external",
    "source_id": "audit-report-2025"
  }'
```

**Talking Points:**

> "Now we add claims—assertions about this vendor. Notice the confidence score. We're not saying this is definitely true; we're saying we have 95% confidence based on our evidence.
>
> Every claim is hashed for integrity. If someone tries to change this claim later, we'll know."

---

### Section 3: Adding Evidence (3 minutes)

**Live Demo: Create Evidence**

```bash
# Attach evidence to the claim
curl -X POST http://localhost:4020/api/v1/evidence \
  -H "Content-Type: application/json" \
  -H "X-User-Id: demo-user" \
  -H "X-Tenant-Id: demo-tenant" \
  -d '{
    "type": "document",
    "title": "SecureAI SOC2 Type II Report 2025",
    "source_uri": "https://secureai.com/compliance/soc2-2025.pdf",
    "source_type": "vendor_provided",
    "content_hash": "sha256:abc123...",
    "reliability_score": 0.9,
    "freshness_date": "2025-03-15T00:00:00Z"
  }'
```

**Talking Points:**

> "Every claim should be backed by evidence. We track:
> - Where the evidence came from
> - A hash of the content (so we know if it changes)
> - How reliable we think the source is
> - How fresh the information is
>
> If the vendor updates their SOC2 report, we can re-verify our claims against new evidence."

---

### Section 4: Making the Decision (4 minutes)

**Live Demo: Create Decision**

```bash
curl -X POST http://localhost:4020/api/v1/decisions \
  -H "Content-Type: application/json" \
  -H "X-User-Id: demo-user" \
  -H "X-Tenant-Id: demo-tenant" \
  -d '{
    "type": "vendor_selection",
    "title": "Q4 2025 Fraud Detection Vendor Selection",
    "question": "Which AI vendor should we select for our fraud detection system upgrade?",
    "context": "Current system is end-of-life. Need vendor with SOC2, GDPR compliance, and proven fraud detection accuracy.",
    "constraints": ["Budget: $500K/year", "Must integrate with existing data lake", "SOC2 required"],
    "options": [
      {
        "name": "SecureAI Corp",
        "description": "Established vendor with strong compliance record",
        "risk_level": "low"
      },
      {
        "name": "FastML Inc",
        "description": "Newer vendor with better accuracy but no SOC2 yet",
        "risk_level": "high"
      }
    ],
    "entity_ids": ["<VENDOR_A_ID>", "<VENDOR_B_ID>"],
    "require_approval": true
  }'
```

**Talking Points:**

> "Now we create the actual decision. We're asking a specific question, providing context, listing constraints, and defining our options.
>
> Notice we're linking this decision to the entities we created—so the full graph is connected."

---

### Section 5: The Disclosure Pack (3 minutes)

**Live Demo: Generate Disclosure Pack**

```bash
curl -X POST http://localhost:4020/api/v1/disclosure/generate \
  -H "Content-Type: application/json" \
  -H "X-User-Id: demo-user" \
  -H "X-Tenant-Id: demo-tenant" \
  -d '{
    "decision_id": "<DECISION_ID>",
    "format": "markdown",
    "include_evidence_details": true,
    "include_audit_trail": true
  }'
```

**Show Generated Output:**

> "This is your disclosure pack. When an auditor, regulator, or your future self asks 'why did we make this decision?'—you hand them this.
>
> It includes:
> - The question and answer
> - All options considered
> - The evidence and claims that supported it
> - The full audit trail
> - A Merkle root hash proving nothing was tampered with"

**Key Value Prop:**

> "This isn't a Word doc someone wrote after the fact. This is cryptographically linked to the actual evidence and approvals. It's provable."

---

### Section 6: The Graph (2 minutes)

**Show Decision Graph Query:**

```bash
curl http://localhost:4020/api/v1/decisions/<DECISION_ID>/graph \
  -H "X-User-Id: demo-user" \
  -H "X-Tenant-Id: demo-tenant"
```

**Talking Points:**

> "Everything is connected in a graph. From any decision, you can trace back to:
> - Which claims supported it
> - What evidence backs those claims
> - Which entities were involved
>
> And every modification is tracked in the provenance chain."

---

### Closing (2 minutes)

**Summary:**

> "So what we've built is:
>
> 1. **Structured decision capture** - not just documents, but typed, linked data
> 2. **Evidence-backed claims** - every assertion has provenance
> 3. **Cryptographic integrity** - hashes and Merkle trees prove nothing changed
> 4. **Audit-ready exports** - disclosure packs for regulators and compliance
>
> The result: Decisions you can actually explain and defend."

**Call to Action:**

> "We're looking for design partners to help us refine this for specific use cases. If you're dealing with vendor risk, model governance, or any decision process that needs an audit trail—let's talk about how IntelGraph can help."

---

## Q&A Preparation

### Anticipated Questions

**Q: How does this integrate with our existing systems?**
> "We have a REST API and GraphQL interface. We can also sync with your document management system, pull from your GRC tools, or integrate with your approval workflows."

**Q: What about AI-generated recommendations?**
> "We support Maestro orchestration that can run AI analysis. The AI recommendation is just another claim with a confidence score—humans still approve. And the AI's reasoning is fully captured in the disclosure pack."

**Q: How do you handle sensitive data?**
> "Policy labels and clearance levels. Sensitive evidence can be automatically redacted in exports. Only users with the right clearance see the full data."

**Q: What's the pricing model?**
> "We're still finalizing pricing with design partners. It will likely be based on decision volume and storage."

**Q: SOC2? GDPR?**
> "We're on the path to SOC2 Type II. The system is designed with GDPR in mind—data locality, right to deletion where applicable, full audit trails."

---

## Demo Environment Reset

```bash
# Reset demo data
curl -X POST http://localhost:4020/api/v1/admin/reset-demo \
  -H "X-User-Id: admin" \
  -H "X-Tenant-Id: demo-tenant"

# Seed fresh demo data
node scripts/seed-demo-data.js
```

---

## Appendix: Sample Data IDs

Keep these handy during demo:

- Demo Tenant: `demo-tenant`
- Demo User: `demo-user`
- Vendor A Entity: `entity_<uuid>`
- Vendor B Entity: `entity_<uuid>`
- Security Claim: `claim_<uuid>`
- SOC2 Evidence: `evidence_<uuid>`
- Vendor Decision: `decision_<uuid>`
