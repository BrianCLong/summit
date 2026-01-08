# Success Metrics & KPIs (InfoMap Service)

## Primary KPI (North Star)

- **Graph Expansion Latency (p95):** < 200ms for single-hop, < 5s for 3-hop (up to 10k nodes).
  - _Why?_ Real-time analysis requires interactivity. Slow queries break the analyst's flow.

## Secondary KPIs

- **Ingestion Throughput:** > 10,000 nodes/minute.
  - _Why?_ During a crisis, new nodes (bots) appear rapidly. The map must be fresh.
- **Classification Accuracy:** > 90% precision in identifying "Amplifier" nodes vs "Organic" nodes.
  - _Why?_ False positives waste analyst time.
- **Cost per Query:** < $0.05 (compute + DB resources).
  - _Why?_ High-frequency querying shouldn't blow the budget.

## SLOs (Service Level Objectives)

| Metric             | Target   | Time Window |
| :----------------- | :------- | :---------- |
| **Availability**   | 99.9%    | Monthly     |
| **Data Freshness** | < 1 hour | Rolling     |
| **Error Rate**     | < 1%     | Daily       |

## Robustness Metrics

- **Adversarial Resistance:** Performance degradation < 20% under "Graph Flooding" attack (simulated 10x node injection).
