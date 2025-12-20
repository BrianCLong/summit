# Summit Pricing & Editions

**Version:** 1.0
**Last Updated:** November 20, 2025

---

## Overview

Summit is the **AI-First Company Operating System** that combines governance, provenance, and intelligent automation. Choose the deployment model that fits your needs.

---

## Deployment Editions

### 🏢 Internal (Self-Hosted)

**For organizations that need complete control**

Deploy Summit within your own infrastructure with full data sovereignty.

**Included:**
- Full Summit platform (graph, workflows, policies, agents)
- Unlimited users within your organization
- All agent archetypes (Chief of Staff, COO, RevOps)
- 17+ pre-built data connectors
- Complete audit trail and provenance
- OPA-based policy engine
- Neo4j knowledge graph
- PostgreSQL + TimescaleDB for time-series data
- Self-service deployment (Helm, Terraform, Docker Compose)

**Requirements:**
- Infrastructure: Kubernetes cluster or VMs (min 16 vCPU, 64GB RAM)
- Database: Neo4j, PostgreSQL, Redis
- Object Storage: S3-compatible
- Identity Provider: OIDC/SAML

**Pricing:**
- **License Fee:** $50,000/year (up to 100 users)
- **Support:** Professional ($12,500/year), Enterprise ($25,000/year)

**Best For:**
- Regulated industries (finance, healthcare, government)
- Organizations with strict data residency requirements
- Teams with existing infrastructure and DevOps capacity

---

### 🎨 White-Label (Managed Self-Hosted)

**For partners, agencies, and multi-tenant providers**

Run Summit under your own brand with full customization and multi-tenancy.

**Included:**
- Everything in Internal edition
- Multi-tenant architecture with tenant isolation
- White-label branding (UI, emails, docs)
- Custom domain and SSL
- Partner API access
- Integration marketplace for publishing connectors
- Priority support and SLAs
- Dedicated success manager

**Requirements:**
- Infrastructure: Same as Internal
- Partnership agreement with Summit

**Pricing:**
- **License Fee:** $100,000/year (base) + $500/tenant/month
- **Revenue Share:** 15% of end-customer revenue (optional alternative)
- **Support:** Included (Enterprise-level SLAs)

**Best For:**
- Systems integrators and consulting firms
- Agencies serving multiple clients
- Platform companies adding company OS capabilities
- VARs and technology partners

---

### ☁️ Hosted SaaS (Coming Q1 2026)

**For teams that want zero infrastructure management**

Fully managed Summit in the cloud with instant onboarding.

**Included:**
- Everything in Internal edition
- Fully managed infrastructure (99.9% uptime SLA)
- Automatic updates and security patches
- Built-in backup and disaster recovery
- SOC 2 Type II compliant
- GDPR, HIPAA, ISO 27001 ready
- Email support (Standard), phone + Slack (Premium)

**Pricing:**
- **Starter:** $2,500/month (up to 25 users)
- **Growth:** $7,500/month (up to 100 users)
- **Enterprise:** Custom pricing (100+ users)

**Best For:**
- Startups and scale-ups
- Teams without dedicated infrastructure
- Fast onboarding and time-to-value
- SaaS-native organizations

---

## Add-On Modules & Operating Model Packs

Extend Summit with pre-configured workflows, policies, and dashboards for specific business functions.

| Operating Model Pack | Description | Price |
|---------------------|-------------|-------|
| **RevOps Pack** | Pipeline health, forecast variance, churn prediction, attribution | $5,000/year |
| **People Ops Pack** | Hiring pipeline, performance reviews, engagement signals | $5,000/year |
| **Finance Pack** | Budget tracking, spend anomalies, financial planning | $5,000/year |
| **Security Pack** | Security posture, threat detection, compliance monitoring | $5,000/year |
| **Product Ops Pack** | Feature requests, usage analytics, roadmap prioritization | $5,000/year |

*Hosted SaaS pricing includes Operating Model Packs pro-rated into monthly fees.*

---

## Support & Services

### Professional Support
- Email support (24-hour SLA)
- Knowledge base access
- Monthly office hours
- **Price:** $12,500/year or included with SaaS

### Enterprise Support
- Email + phone + Slack support (4-hour SLA)
- Dedicated Slack channel
- Quarterly business reviews
- Named support engineer
- **Price:** $25,000/year or included with White-Label

### Professional Services
- Implementation consulting: $2,500/day
- Custom connector development: $10,000-$25,000
- Custom agent development: $25,000-$50,000
- Training & workshops: $2,500/session

---

## Feature Comparison

| Feature | Internal | White-Label | Hosted SaaS |
|---------|----------|-------------|-------------|
| **Core Platform** |
| Knowledge graph (Neo4j) | ✅ | ✅ | ✅ |
| Workflow engine | ✅ | ✅ | ✅ |
| Policy engine (OPA) | ✅ | ✅ | ✅ |
| Approval workflows | ✅ | ✅ | ✅ |
| Audit trail | ✅ | ✅ | ✅ |
| **Agent Archetypes** |
| AI Chief of Staff | ✅ | ✅ | ✅ |
| AI COO | ✅ | ✅ | ✅ |
| AI RevOps | ✅ | ✅ | ✅ |
| Custom agents (SDK) | ✅ | ✅ | ✅ |
| **Integrations** |
| Pre-built connectors (17+) | ✅ | ✅ | ✅ |
| Custom connectors | ✅ | ✅ | ✅ |
| Webhook triggers | ✅ | ✅ | ✅ |
| **Security & Compliance** |
| SSO (OIDC/SAML) | ✅ | ✅ | ✅ |
| RBAC & ABAC | ✅ | ✅ | ✅ |
| Audit logs | ✅ | ✅ | ✅ |
| SOC 2 Type II | Self-managed | Self-managed | ✅ (Q1 2026) |
| Data residency | Full control | Full control | Select region |
| **Deployment** |
| Self-hosted | ✅ | ✅ | ❌ |
| Multi-tenant | ❌ | ✅ | ✅ |
| White-label branding | ❌ | ✅ | ❌ |
| **Support** |
| Email support | Add-on | Included | Included |
| Phone + Slack | Add-on | Included | Premium tier |
| Dedicated CSM | ❌ | ✅ | Enterprise tier |
| **Pricing Model** |
| Annual license | ✅ | ✅ | ❌ |
| Monthly subscription | ❌ | ❌ | ✅ |
| Per-user pricing | Yes (tiers) | Per-tenant | Yes (tiers) |

---

## Frequently Asked Questions

### General

**Q: What is included in the base platform?**
A: All editions include the core Summit platform: knowledge graph, workflow engine, policy engine, approval workflows, audit trail, and all three agent archetypes (Chief of Staff, COO, RevOps).

**Q: Can I start with Internal and migrate to Hosted SaaS later?**
A: Yes. We provide migration tools and support to move between deployment models.

**Q: Do you offer free trials?**
A: Yes. For Hosted SaaS (when available), we offer a 14-day free trial. For Internal and White-Label, we offer a 30-day proof-of-concept license.

### Licensing

**Q: How is "user" defined?**
A: A user is a unique individual with login credentials. Service accounts and API-only integrations do not count as users.

**Q: What happens if we exceed our user limit?**
A: Internal edition has user tiers (25, 50, 100, 250, 500+). Contact sales to upgrade. White-Label is per-tenant. Hosted SaaS charges per-user overage at $100/user/month.

**Q: Can we deploy across multiple regions?**
A: Yes. Each region requires a separate license for Internal/White-Label. Hosted SaaS supports multi-region in Enterprise tier.

### Security & Compliance

**Q: Is Summit SOC 2 compliant?**
A: Hosted SaaS will be SOC 2 Type II certified by Q1 2026. For Internal/White-Label, you maintain your own compliance posture using Summit's built-in controls (audit logs, RBAC, encryption).

**Q: Where is data stored?**
A: Internal/White-Label: You control data location. Hosted SaaS: US, EU, or APAC regions (select during signup).

**Q: Can we use our own LLM models?**
A: Yes. Summit's agent archetypes support BYO-LLM (bring your own LLM) via LiteLLM integration. Configure OpenAI, Anthropic, Azure OpenAI, or self-hosted models.

### Integrations & Extensibility

**Q: Can we build custom connectors?**
A: Yes. All editions include the connector SDK. White-Label partners can publish connectors to the integration marketplace.

**Q: Can we build custom agents?**
A: Yes. Use the Agent Archetype SDK to build custom agents. Professional services available for complex implementations.

**Q: Do you integrate with [specific tool]?**
A: We have 17+ pre-built connectors (Slack, Teams, GitHub, Jira, Salesforce, etc.). See [Integration Catalog](https://summit.local/integrations) for full list. Custom connectors available via professional services.

### Support

**Q: What are support SLAs?**
A: Professional Support: Email support, 24-hour response. Enterprise Support: Email + phone + Slack, 4-hour response for critical issues.

**Q: Do you offer implementation services?**
A: Yes. Professional services include implementation consulting, custom development, training, and workshops. See [Services](https://summit.local/services) for details.

---

## Get Started

### Ready to deploy Summit?

**Internal Edition:**
[Request Trial License](https://summit.local/trial/internal) → Deploy in your infrastructure → Go live

**White-Label Edition:**
[Apply for Partnership](https://summit.local/partners) → Partnership agreement → Deploy for clients

**Hosted SaaS (Waitlist):**
[Join Waitlist](https://summit.local/saas-waitlist) → Notify when available (Q1 2026)

### Questions?

- **Sales:** [sales@summit.com](mailto:sales@summit.com)
- **Technical:** [support@summit.com](mailto:support@summit.com)
- **Partnerships:** [partners@summit.com](mailto:partners@summit.com)

---

## Volume Discounts

Contact sales for pricing on:
- 500+ users (Internal)
- 50+ tenants (White-Label)
- Enterprise contracts with multi-year commitments

---

*Pricing subject to change. All prices in USD. Annual licenses invoiced annually. Monthly subscriptions billed monthly.*
