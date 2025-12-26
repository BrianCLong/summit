# Sales & GTM FAQ

## 🤖 Autonomy & AI

**Q: Is Summit an "Autonomous AI Agent"?**
**A: Conditional.** Summit contains *agentic workflows* (e.g., automated data collection, periodic monitoring), but it is designed as a **Human-Centric** platform. It does not take kinetic actions or finalize high-stakes decisions without human approval.

**Q: Does the AI hallucinate?**
**A: Minimized.** We use "Graph-RAG" (Retrieval Augmented Generation). The AI is instructed to answer *only* based on retrieved evidence from the database. It cites sources. However, no LLM is 100% error-proof, which is why we emphasize the "Provenance" tab.

**Q: Is it Quantum-Resistant?**
**A: No.** While we use modern standard cryptography (TLS 1.3, AES-256), we do not currently claim Post-Quantum Cryptography (PQC) compliance. This is on our long-term roadmap.

## 🔐 Security & Compliance

**Q: Can we deploy this on-prem / air-gapped?**
**A: Yes.** Summit is containerized (Docker/Kubernetes) and does not strictly require external internet access if local LLMs (e.g., Llama via Ollama) are configured.

**Q: Is it SOC2 / FedRAMP certified?**
**A: No.** The *software architecture* supports these controls (audit logs, RBAC, encryption), but the *instance* depends on the deployment environment. We provide "Evidence Bundles" to help customers achieve certification.

## 🏗️ Technology

**Q: Does it replace our existing SIEM / Data Lake?**
**A: No.** Summit sits *on top* or *alongside*. It is an analysis layer. It can ingest alerts from a SIEM, but it is not a log aggregator.

**Q: How does it scale?**
**A: Horizontal.** The stateless API tier scales with load. The database tier (Neo4j/Postgres) can be clustered for high availability in Enterprise editions.
