# Streaming Differential Privacy

A windowed aggregator consumes Kafka topics and emits only noisy aggregates.
Each micro-batch is clamped, checked for `k ≥ 25`, and charged epsilon from an
accountant with cooldowns. Results go to a PII-off topic for dashboards and
alerts.
