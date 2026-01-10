# Advantages over Prior Art — ITD-OIP

- Distills interactive transform traces into reusable compiled investigation macros rather than relying on manual workflows.
- Applies plan optimization (dedupe, batching, join reordering, filter pushdown) with policy and license verification prior to execution.
- Produces witness chains for transform steps, enabling reproducible investigations without replaying entire interactive sessions.
- Supports cost estimation and scheduling to manage latency budgets and rate limits across data sources.
- Embeds jurisdictional checks to reduce compliance risks during automation.
