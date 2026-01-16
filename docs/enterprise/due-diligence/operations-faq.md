# Operations FAQ

**Q: Who manages the updates?**
A: For SaaS, Summit manages all updates. For Self-Hosted, your team manages updates using our standard Helm charts and release artifacts.

**Q: What is the upgrade cadence?**
A: We release monthly minor versions and quarterly major versions. Critical security patches are released within 24 hours.

**Q: How do we monitor the application?**
A: We provide a standard observability pack (Prometheus Rules + Grafana Dashboards) that you can import into your monitoring system.

**Q: What support levels are available?**
A: We offer Standard (8x5) and Enterprise (24x7) support packages with defined SLAs.

**Q: Do you need root access to our cluster?**
A: No. The application runs as non-root users and requires no privileged escalation.
