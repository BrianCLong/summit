# Intellex (intellex.xyz) Competitor Watchlist

- **Owner:** Strategy (handoff to Competitive Intelligence)
- **Cadence:** Weekly sweep + ad-hoc alerts
- **Channels:** intellex.xyz, LinkedIn, X, Discord, GitHub, ProductHunt, RSS feeds
- **Objectives:**
  1. Detect protocol, pricing, and governance updates within 24h.
  2. Flag new design-partner wins and community launches.
  3. Track sentiment shifts across targeted verticals (Logistics, Support, Nonprofit, Regulated).

---

## 1. Monitoring Checklist

| Frequency | Source | Signal | Owner | Notes |
| --- | --- | --- | --- | --- |
| Daily | intellex.xyz/blog | Product & roadmap announcements | Strategy Analyst | Subscribe via RSS, archive PDFs |
| Daily | Discord / community | Connector launches, bounty updates | DevRel | Pipe highlights into #competitor-watch |
| 3x Weekly | LinkedIn & X | Hiring, partnerships, design-partner logos | Marketing Intel | Screenshot + summarise |
| Weekly | GitHub org(s) | Protocol commits, SDK releases | Platform Intel | Track license changes |
| Weekly | Web archives | Pricing page, docs revisions | Pricing Ops | Capture diffs via Diffbot |
| Weekly | Glassdoor / job boards | New roles, comp, focus areas | People Ops | Annotate for hiring signals |
| Monthly | Conference calendars | Speaking engagements, sponsorships | Events Lead | Evaluate presence & themes |

---

## 2. Competitive Intelligence Fields (Update Template)

```yaml
week: 2025-10-17
headline: "Intellex teases compliance add-on at Open Agents Summit"
product: ["protocol", "governance"]
impact: high
summary: >-
  Intellex previewed a compliance toolkit with basic lineage attestations but lacked SBOM/SLSA. Opportunity to pre-empt with
  Disclosure Pack v1 and publish auditor walkthrough.
actions:
  - Owner: Platform Lead
    task: Publish Gateway latency benchmark blog
    due: 2025-10-20
  - Owner: Governance Lead
    task: Release policy bundle diff comparing Intellex claims vs. Topicality OPA packs
    due: 2025-10-22
notes: |
  Capture customer quotes; evaluate whether compliance narrative resonates with regulated ICPs.
```

---

## 3. Alert Routing

- **High Impact (Product/Governance/Pricing shifts):** Notify Co-CEOs, Product, Platform immediately; open Maestro incident with response playbook.
- **Medium Impact (Marketing/Community moves):** Post to #competitor-watch, summarise in Daily Dispatch.
- **Low Impact (Hiring, minor updates):** Batch into weekly digest.
- **Escalation:** If Intellex announces enterprise governance guarantees, trigger Governance task force to counter-message within 24h.

---

## 4. Intelligence Backlog (Initial Seeds)

| Item | Description | Status | Owner | Next Review |
| --- | --- | --- | --- | --- |
| P0 | Confirm Intellex royalty settlement mechanism & legal framing | Open | Legal Liaison | 2025-10-18 |
| P0 | Track Intellex starter kit performance metrics if published | Open | Product Analyst | 2025-10-19 |
| P1 | Monitor for regulated vertical references (Finserv/Healthcare) | Open | GTM Research | 2025-10-21 |
| P1 | Identify connector roadmap (Slack/Teams parity vs. depth) | Open | Platform Intel | 2025-10-20 |
| P2 | Assess community growth (Discord MAU, GitHub stars) | Open | DevRel | 2025-10-23 |

---

## 5. Reporting

- **Weekly Digest:** 3-sentence summary, risk rating, recommended counter-move; delivered before Monday stand-up.
- **Monthly Deep Dive:** Trend analysis, intel accuracy review, scoreboard vs. our plan (adoption velocity, governance proof points).
- **Quarterly Board Slide:** Key shifts, win/loss insights, recommended strategic adjustments.

> _Activation Note:_ Connect this watchlist with Maestro automations to auto-open tasks when high-impact alerts trigger.
