# Risk Drift Monitoring

## Metrics

- Score distribution buckets.
- Feature mean/variance over time.

## Triggers

- Drift beyond 3σ opens ticket and sends internal alert.

## Playbook

1. Confirm data pipeline health.
2. Recompute sample scores.
3. File retraining ticket if drift persists.
