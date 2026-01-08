# Competitive Analysis: Summit vs. Industry Leaders

| Feature            | Summit                                    | Bellingcat (Methodology/Tools) | Recorded Future     | SpiderFoot         |
| :----------------- | :---------------------------------------- | :----------------------------- | :------------------ | :----------------- |
| **Focus**          | **Defensive PsyOps & Cognitive Security** | Open Source Investigation      | Threat Intelligence | OSINT Automation   |
| **Architecture**   | **Graph-Native (Neo4j)**                  | Decentralized Tools            | Proprietary Cloud   | Python Modules     |
| **Attack Surface** | **Simulated + Passive Recon**             | Manual / Tool-assisted         | Active Scanning     | Passive Recon      |
| **PsyOps Defense** | **Native (Influence Mapping)**            | Manual Analysis                | Separate Module     | N/A                |
| **Deployment**     | **Self-Hosted / Hybrid**                  | N/A (Methodology)              | SaaS                | Self-Hosted / SaaS |
| **Extensibility**  | **Plugin System (Planned)**               | Scriptable                     | API-based           | Modular (Python)   |

## Key Differentiators

1.  **Cognitive Security First**: Unlike standard OSINT tools that focus on infrastructure, Summit treats _narratives_ and _influence_ as critical attack vectors.
2.  **Simulation Engine**: Summit includes an "Attack Surface Emulator" and "Red Team" package to _predict_ threats, not just report them.
3.  **Graph-Centric**: Built on Neo4j, allowing for complex relationship mapping between digital assets, actors, and narratives.

## Gap Analysis

- **Data Sources**: SpiderFoot has vastly more out-of-the-box integrations (200+). Summit needs to accelerate connector development.
- **Enterprise Polish**: Recorded Future sets the bar for dashboards and reporting. Summit's UI is evolving but needs more "executive-ready" views.
- **Community**: Bellingcat has a massive community of practitioners. Summit needs to foster a similar ecosystem through the Plugin Architecture.

## Strategic Opportunities

- **"Killer Feature" 1: Narrative Propagation Simulation** - Visualize how disinformation spreads across the graph.
- **"Killer Feature" 2: Automated Attribution Chains** - Link infrastructure to actors using graph algorithms automatically.
- **"Killer Feature" 3: Zero-Config "Shadow IT" Discovery** - Frictionless setup to find exposed assets (S3, easy-to-guess subdomains).
