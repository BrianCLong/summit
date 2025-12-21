# Public Policy Operating Blueprint

This blueprint operationalizes the policy epics into a concrete, governance-backed plan focused on regulatory coverage, disciplined messaging, and durable government relationships. It is designed for quarterly review and continuous update.

## 1) Jurisdiction Strategy

### Top regulatory regimes
- **Data/Privacy:** GDPR/EEA, UK DPA, California CCPA/CPRA, Canadian CPPA (forthcoming), Singapore PDPA, Brazil LGPD, India DPDP.
- **AI:** EU AI Act (incl. Codes of Practice), UK pro-innovation framework, U.S. NIST AI RMF + EO 14110 actions, sector AI guardrails (health/finance), OECD/G7 Hiroshima, ISO/IEC 42001.
- **Cybersecurity:** EU NIS2/DORA, U.S. SEC cyber rules, TSA/DoD sector directives, UK NIS, Australian SOCI, Singapore CSA, global critical-infrastructure norms.
- **Sectoral:** Financial services (GLBA/FFIEC/PCI), healthcare (HIPAA/42 CFR Part 2), telecom, critical infrastructure, export controls (OFAC/EAR), law-enforcement cooperation.

### Jurisdiction matrix (now vs. next 18 months)
| Region | Current operations | Planned expansion (≤18 mo.) | Primary regimes to track | Local counsel | Data residency stance |
| --- | --- | --- | --- | --- | --- |
| U.S. federal + CA/NY | Primary market | Deepen Fed/State coverage | FTC/CFPB/SEC, CCPA/CPRA, AI EO | Yes | U.S.-first, FedRAMP-ready path |
| EU (core markets) | Active customers | Broader enterprise push | GDPR, AI Act, NIS2/DORA | Yes | EU data region + SCC/DTIA |
| UK | Active pilots | Scale with regulated buyers | UK DPA, Online Safety, AI White Paper | Yes | UK region; ICO consultation playbook |
| Canada | Limited pilots | Expand in public/FS | PIPEDA→CPPA, provincial health/FS | Planned | CA region optional; SCCs + TIAs |
| APAC (SG, AU, JP) | Select customers | Gradual expansion | PDPA, SOCI, APPI, ISMAP | Planned | Regional residency by RFP |
| India/Brazil | Early-stage | Evaluate growth | DPDP, LGPD | Planned | Residency optional; prepare DPA modeling |

## 2) Threats and Opportunities (impact × likelihood × timeline)
| Item | Impact | Likelihood | Timeline | Owner | Mitigation/Action |
| --- | --- | --- | --- | --- | --- |
| EU AI Act conformity for high-risk use cases | High | High | 6–12 mo | Legal (AI), Product | Map use cases → Article 9/10 controls, prep technical docs, notify NB readiness |
| GDPR enforcement on LLM data minimization | High | Medium | 3–6 mo | Privacy Eng | Complete DPIAs, retention minimization, synthetic data where possible |
| U.S. state privacy patchwork (sensitive data) | Medium | High | 0–6 mo | Privacy Ops | Uniform DSAR/consent flows, state-specific notices |
| SEC cyber disclosures (public customers) | Medium | Medium | 0–6 mo | Security | Incident playbook ≤4 days, board-level materiality rubric |
| Export controls on frontier models | High | Medium | 6–12 mo | Legal (Trade) | Dual-use screening, customer end-use certifications |
| NIS2/DORA operational resilience | Medium | Medium | 6–12 mo | SRE/SecOps | Map to resilience controls, attestations in trust center |
| AI safety narrative gap vs. competitors | High | Medium | 0–3 mo | Comms/Policy | Publish safety case + benchmarks; regulator briefings |

## 3) Keystone agencies and committees
- **U.S.:** FTC (privacy/AI fairness), CFPB (consumer finance), SEC (cyber disclosure), NTIA/NIST (AI RMF), DOJ/Antitrust, DHS/CISA/TSA (critical infra), Commerce/BIS (export), FCC (comm), HHS/OCR (health), Congressional committees (Commerce, Judiciary, Homeland Security), state AGs (CA/NY/VA/CO).
- **EU/UK:** European Commission + Board (EDPB), national DPAs, AI Office/Notified Bodies, ENISA, EBA/EIOPA/ESMA (DORA), ICO, CMA.
- **Global:** Singapore PDPC, Australia OAIC/ACSC, India DPB, Brazil ANPD, Canada OPC, OECD/G7/ISO/IEEE working groups.

## 4) Obligations and upcoming rulemakings
| Domain | Current obligations | Upcoming items (watchlist) | Evidence needed |
| --- | --- | --- | --- |
| Privacy | DPIA/DSAR, SCC/DTIA, consent for sensitive data | EU guidance on GenAI, CA CPPA rulemaking, ANPD AI guidance | DPIAs, RoPA, consent logs, retention schedules |
| AI | Model cards, data lineage, human oversight | EU AI Act standards, UK pro-innovation consultations, U.S. safety test reporting | Model evaluations, red-team results, policy-aligned guardrails |
| Security | ISO 27001/SOC 2 controls, incident response | NIS2 transposition, SEC cyber enforcement, DORA RTS/ITS | Runbooks, drill evidence, vuln mgmt SLAs, audit trails |
| Resilience/Financial | Uptime/SLO dashboards, BCDR | DORA scenario testing, sector tabletop requests | RTO/RPO tests, dependency maps, vendor risk results |
| Trade | OFAC/EAR screenings | Frontier model thresholds, updated entity lists | Screening logs, export classifications, customer attestations |

## 5) Policy positions (support/oppose)
- **Support:** risk-based AI governance, harmonized privacy (global SCC/CBPR), outcome-based security/resilience standards, transparency with IP/abuse protections, interoperable portability, voluntary-but-auditable safety benchmarking.
- **Oppose/Limit:** blanket data localization, strict liability for downstream misuse, mandatory source disclosure for proprietary models, prescriptive algorithmic design mandates without risk calibration.
- **Why:** positions anchored to safety evidence, customer outcomes (uptime, security, fairness), and enabling regulated adoption.

## 6) Calendar and engagement
- Maintain rolling **180-day calendar** of comment periods, hearings, consultations; update weekly via policy CRM.
- Assign **owner ≤24h** after NPRM/consultation publication; create briefing memo (what/why/asks) + decision by SLA date.
- Schedule **quarterly regulator briefings** (FTC/SEC/EDPB/ICO/CISA as relevant) with leave-behinds tailored to jurisdiction.

## 7) Ownership map
| Domain | Legal | Product/Tech | Security/Privacy | Comms/GR |
| --- | --- | --- | --- | --- |
| Privacy/data | GC (Privacy) | Data PM | Privacy Eng | Policy Comms |
| AI governance | GC (AI) | AI/ML Lead | Secure AI Red Team | Policy Comms |
| Cyber/resilience | GC (Cyber) | SRE Lead | CISO | GR lead |
| Trade/sanctions | Trade Counsel | Product Ops | Security Ops | GR lead |
| Competition | Antitrust Counsel | Product Strategy | Security | Comms |

## 8) Exception registry
- Use `docs/policy-exceptions.md` as the single register: each entry requires **owner, scope, control deviation, expiry ≤90 days, compensating controls, approval** (GC + CISO).
- Monthly review; auto-expire without re-approval; board-visible metric = open exceptions by domain.

## 9) Quarterly public policy brief (exec/board)
- **Structure:** headline risks/opportunities, jurisdiction scoreboard, engagement outcomes, exceptions & remediation, ROI metrics (cycle time reduced, deals enabled, avoided costs), roadmap next quarter.
- **Inputs:** CRM stats, trust center metrics (uptime, vulns SLA, DSAR SLA), AI safety benchmarks, regulatory calendar.

## 10) Messaging discipline
- **Core messages:** (1) Innovation with guardrails; (2) Safety and reliability proven by metrics; (3) Jobs and competitiveness (customers ship faster); (4) Consumer/mission benefit (reduced risk, faster insight).
- **Proof points:** uptime/SLO history, incident MTTR, red-team + bias eval results, customer case studies (permissioned), third-party attestations.
- **Opposition research:** track common critiques (privacy risk, bias, lock-in, over-collection) with pre-approved rebuttals grounded in evidence; maintain FAQ per regulator type (privacy/competition/AI).
- **Approval gate:** no policy-facing material without Legal/Policy review; log in narrative repository.
- **Narrative log:** record what we said, questions asked, commitments made, follow-ups.

## 11) Government relations operating system
- **Stakeholder map** with owner + cadence (quarterly minimum); log every interaction in CRM (pipeline hygiene enforced).
- **Briefing protocol:** agenda, roles, leave-behind, commitments with due dates; post-brief summary within 24h.
- **Hill kit:** one-pager, demo script, trust packet (controls, uptime, audits), case studies aligned to jurisdiction.
- **Coalitions:** trade groups/standards bodies; publish joint letters where aligned; keep ethics guardrails (no quid pro quo).
- **Rapid response:** playbook for inbound inquiries with 24h acknowledgment, 72h substantive path, privileged handling.

## 12) Regulatory engagement & rulemaking
- **Monitor NPRMs/consultations** daily; assign owner ≤24h.
- **Comment templates** with evidence and alternative language; align with model statutory/regulatory library.
- **Technical input** checklist to avoid impractical commitments; integrate AI/Privacy/Security reviews.
- **Post-comment follow-up**: request technical assistance meetings; consistent answers to regulator questions; track commitments.
- **Enforcement awareness:** maintain sheet of current penalties/themes; adjust controls proactively.

## 13) Compliance as leverage
- **Controls-as-code** with evidence artifacts; keep trust center updated (uptime, SLA, SOC/ISO, pen-test summaries, AI safety benchmarks).
- **Regulator-ready evidence packs** for privacy/AI/security with versioning and data lineage.
- **Third-party risk**: vendor assessments published; disclose security posture with confidence.
- **Metrics:** exceptions down, MTTR down, DSAR SLA, model eval coverage, resilience test cadence.

## 14) Third-party validators
- Maintain **advisory council** with transparent charters and disclosures; avoid conflicts.
- Encourage **customer advocacy** (opt-in) for policy impacts; prep speakers for hearings/consultations.
- Build **rapid rebuttal** workflow for misinformation with polite, sourced responses.

## 15) Political risk & export controls
- **Country risk ratings** feeding sales/expansion; data residency decision trees; shutdown/exit playbooks for high-risk countries.
- **Export/sanctions screening** enforced pre-signature and continuously; escalation workflow for dual-use concerns.
- **Quarterly board update** on political risk posture; training for Sales/CS on prohibited jurisdictions/use cases.

## 16) Hearing & investigation readiness
- **Testimony kit**: narrative, stats, tough Q&A, exhibits; executives trained on disciplined answers.
- **Document retention/production** workflows with privilege protocols; mock hearings with hostile questioning.
- **Commitment tracking** for statements made in hearings; align public comms (calm, factual, minimal).

## 17) Governance & ROI
- **Policy council** with decision SLAs; maintain **policy pipeline dashboard** (engagements, comments, wins, risks).
- **ROI metrics:** procurement cycle reduction, market access enabled, avoided costs; **budget discipline** tied to prioritized outcomes.
- **Annual review**: retire ineffective tactics, double down on high-ROI engagements.

## 18) Forward-leaning enhancements
- **AI-native policy CRM** that tags interactions to positions, evidence, and commitments; auto-suggest rebuttals from approved FAQ bank.
- **Standards influence**: seed open benchmarks for AI safety aligned to our controls to shape compliance baselines.
- **Controls telemetry**: auto-export attestable metrics (SLOs, model evals, DSAR SLA) into regulator-ready dashboards.
