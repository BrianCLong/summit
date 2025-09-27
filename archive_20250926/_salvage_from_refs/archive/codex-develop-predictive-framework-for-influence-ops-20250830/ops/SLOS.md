# Service Level Objectives

| Service      | SLI              | Target | Alert Policy                         | Error Budget |
|--------------|------------------|--------|--------------------------------------|--------------|
| Graph API    | Availability     | 99.5%  | Page if 5m error rate >1%            | 0.5%         |
| UI           | P95 Latency      | <300ms | Warn at 250ms, page at 300ms         | 10%          |
| Connectors   | Success Rate     | 99%    | Page if <97% success over 1h         | 1%           |
| Ledger       | Export Validation| 99.9%  | Page if chain validation fails       | 0.1%         |
| Copilot      | Response Accuracy| 95%    | Warn <95%; disable feature <90%      | 5%           |

Alerting integrates with Prometheus and OTEL. Error budgets reset quarterly.
