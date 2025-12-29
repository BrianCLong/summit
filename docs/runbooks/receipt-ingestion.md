# Runbook: Receipt Ingestion Failures

## Symptoms

- **Alerts:** Prometheus alerts firing for `ReceiptIngestionLatencyHigh` or `ReceiptIngestionErrorRateHigh`.
- **User Reports:** Users report that receipts are not appearing in the system after being submitted.
- **Metrics:** Grafana dashboard shows a drop in the number of ingested receipts, an increase in p95 latency, or a spike in the error rate.

## Quick Checks

1.  **Check the status of the receipt ingestion service:**
    ```bash
    kubectl get pods -l app=receipt-ingestion
    ```
2.  **Check the logs of the receipt ingestion service for errors:**
    ```bash
    kubectl logs -l app=receipt-ingestion -f --tail=100
    ```
3.  **Check the status of the message queue (e.g., Kafka, RabbitMQ) that feeds the ingestion service.**
4.  **Check the status of the database that the ingestion service writes to.**

## Rollback Steps

If the issue was caused by a recent deployment, roll back to the previous version:

```bash
helm rollback receipt-ingestion $(helm history receipt-ingestion | grep DEPLOYED | tail -2 | head -1 | awk '{print $1}')
```

## Logs and Metrics

- **Logs:** Receipt ingestion service logs are available in Grafana Loki or can be accessed via `kubectl logs`.
- **Metrics:** A Grafana dashboard for receipt ingestion is available at `/grafana/d/receipt-ingestion-dashboard`.
- **SLOs:** SLO definitions are in `ops/slo/receipt-ingestion-slos.yaml`.
- **Alerts:** Alerting rules are in `ops/prometheus/receipt-ingestion-slo-rules.yaml`.
