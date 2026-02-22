# EP01-T01 Stakeholder Map & RACI

## Stakeholder Map

| Stakeholder Group | Persona | Role | Interest | Influence |
| :--- | :--- | :--- | :--- | :--- |
| **Product** | Product Manager (Alice) | Owner | Feature prioritization, Roadmap | High |
| **Architecture** | System Architect (Bob) | Consulted | System design, Scalability | High |
| **Security** | Security Engineer (Charlie) | Approver | Compliance, Data Privacy | High |
| **Data** | Data Scientist (Dana) | Consulted | Schema design, Analytics | Medium |
| **DevOps** | SRE Lead (Eve) | Informed | Deployment, Reliability | Medium |
| **Frontend** | UX Designer (Frank) | Consulted | User Interface, Usability | Low |
| **QA** | QA Lead (Grace) | Informed | Testing strategy, Quality Gates | Medium |
| **Compliance** | Legal/Compliance Officer (Heidi) | Approver | Regulatory adherence | High |
| **Ingest** | Data Engineer (Ivan) | Responsible | Data pipelines, Connectors | Medium |

## RACI Matrix (by Epic)

| Task | Product | Architecture | Security | Data | DevOps | Ingest | QA | Compliance |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **EP01 Backlog** | R/A | C | C | I | I | I | I | C |
| **EP02 Architecture** | C | R/A | C | C | C | I | I | I |
| **EP03 Data Model** | C | C | C | R/A | I | C | I | C |
| **EP04 API** | C | C | C | C | C | I | I | I |
| **EP05 Ingest** | C | C | C | C | C | R/A | I | I |
| **EP06 Security** | C | C | R/A | C | C | I | I | C |
| **EP07 Provenance** | C | C | C | C | C | I | I | R/A |
| **EP08 Frontend** | C | C | C | I | I | I | I | I |
| **EP09 AI/Analytics** | C | C | C | C | I | I | I | I |
| **EP10 CI/CD** | I | C | C | I | R/A | I | C | I |
| **EP11 Observability** | I | C | C | I | C | I | I | I |

**Legend:**
*   **R**: Responsible (Does the work)
*   **A**: Accountable (Approves the work)
*   **C**: Consulted (Two-way communication)
*   **I**: Informed (One-way communication)
