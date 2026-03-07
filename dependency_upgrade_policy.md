# Dependency Upgrade Policy

## Rolling Upgrade Strategy
To maintain system security, performance, and stability, dependencies will be updated on a continuous rolling basis:
- **Minor & Patch Versions:** Automated daily updates (e.g., via Renovate or Dependabot) merged automatically if tests pass.
- **Major Versions:** Automated PR generation, requiring manual review and explicit approval by the engineering team to manage breaking changes.
- **Node.js Runtime:** Upgraded iteratively (currently targeting Node 22). Next upgrades will follow LTS schedules.
- **Security Patches:** Pushed immediately upon identification of high/critical vulnerabilities.

## Security & Performance Targets
- **Security:** Zero known critical vulnerabilities in production images. Container base images (e.g., OPA, Node.js) must use pinned specific versions instead of `latest` tags to ensure deterministic builds.
- **Performance:** Regular benchmarking must confirm no degradation in startup times, memory usage, or response latency after upgrades.

## Weekly Upgrade Delta Report
An automated weekly report will be generated detailing:
- **What Changed:** List of updated packages, containers, and runtimes.
- **Why:** Reason for upgrade (e.g., security patch, performance improvement, bugfix).
- **Risk Assessment:** Categorized risk level (Low, Medium, High) with rollback plans and mitigation strategies.
