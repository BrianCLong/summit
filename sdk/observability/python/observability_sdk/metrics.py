from opentelemetry import metrics


def register_golden_metrics(service_name: str):
    meter = metrics.get_meter(service_name)
    latency = meter.create_histogram(
        "http_server_request_duration_seconds",
        description="End-to-end API latency",
        unit="s",
    )
    request_total = meter.create_counter(
        "http_server_request_total", description="HTTP request volume"
    )
    worker_latency = meter.create_histogram(
        "worker_job_duration_seconds",
        description="Background worker latency",
        unit="s",
    )

    return {
        "record_http_latency": latency.record,
        "increment_http_requests": lambda attributes: request_total.add(1, attributes),
        "record_worker_latency": worker_latency.record,
    }
