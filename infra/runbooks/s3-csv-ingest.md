# S3 CSV Ingest Worker Runbook

## Overview

This runbook describes how to operate the high-throughput S3 → CSV ingestion
worker. Each worker process is capable of sustaining ≥50 MB/s on commodity
instances by relying on multipart S3 downloads, a backpressured CSV parser,
Bloom-filter deduplication, and Parquet normalization.

## Configuration

### Helm values

- `connectorsWorker.replicas` – number of worker pods. Scale linearly based on
  backlog; the connector uses stateless workers that coordinate via the control
  plane.
- `connectorsWorker.s3.bucket` / `prefix` – per-tenant S3 configuration.
- `connectorsWorker.resources` – tune CPU/memory. A typical 4 vCPU / 8 GiB pod
  handles ~200 MB/s aggregate across four workers.
- `connectorsWorker.env` – inject credentials or IRSA role ARN for the tenant
  bucket.

### Connector tuning

- `chunk_size` (bytes) – S3 multipart chunk size. 8–32 MiB works well; larger
  values amortize TLS overhead but require more memory.
- `max_workers` – concurrent S3 range fetchers. Start with the number of vCPUs
  available to the pod.
- `buffer_chunks` – queue depth between downloader and CSV parser. Increase if
  parser threads become starved (observe via the `source_backlog` metric).
- `batch_size` – number of CSV rows per batch before normalization/DQ. Smaller
  batches reduce memory footprint at the cost of more Parquet files.
- `dedupe.keys` – list of column names used for Bloom-filter dedupe. Combine
  with `dedupe.capacity` and `dedupe.error_rate` to control FP rate.

## Operations

1. **Scaling:** Watch `connectors_worker_throughput_mb_per_s` and
   `connectors_worker_backlog_rows`. Increase replicas when throughput drops
   > 10% or backlog grows for three consecutive scrapes.
2. **Chunk tuning:** If latency p95 > 3s, increase `chunk_size`; if memory
   pressure occurs, decrease it and increase worker count.
3. **Memory sizing:** Each worker requires roughly `chunk_size * buffer_chunks`
   bytes. Set pod memory requests to `1.5x` this figure.
4. **Deduplication:** Monitor `connectors_worker_dedupe_hits`. A spike usually
   indicates upstream replay; verify Bloom filter capacity.

## DLQ Handling

- Failed batches (DQ, parse errors) are written to the `dlq/` prefix inside the
  configured output bucket with provenance metadata.
- Trigger a reprocessing run by copying DLQ objects back into the staging
  prefix; dedupe prevents duplicates on re-run.

## Benchmark Procedure

1. Deploy one worker with `chunk_size=16MiB`, `max_workers=8`.
2. Load the synthetic 20 GiB CSV fixture into MinIO (`make load-sample-data`).
3. Run `python -m connectors.bench.loadgen --workers 1 --target-mbps 50`.
4. Increase `--workers` to 4; confirm linear scaling (≥200 MB/s aggregate).
5. Upload the generated Prometheus metrics and linear scaling chart from the CI
   artifact `bench-report/` to the release notes.

## Troubleshooting

| Symptom              | Checks                                                                     | Action                                                    |
| -------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Throughput < 50 MB/s | Verify S3 account limits, network throttling, examine `batch_latency_p95`. | Increase `max_workers` or deploy closer to bucket region. |
| Backlog growth       | Inspect `source_backlog` and `dedupe_hits`.                                | Scale worker replicas and validate dedupe key accuracy.   |
| DLQ spikes           | Review DLQ Parquet files via Athena.                                       | Update schema mapping or adjust DQ rules.                 |

## References

- Terraform IAM policy: `infra/terraform/storage/s3_ingest_policy.tf`
- Helm chart: `infra/helm/intelgraph/templates/connectors-worker.yaml.tpl`
- Connector SDK: `packages/connectors/src/sources/s3.py`
