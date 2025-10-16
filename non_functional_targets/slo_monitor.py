# non_functional_targets/slo_monitor.py

from typing import Any


def check_graph_query_slo(
    query_latency_ms: float, p_threshold: float = 95.0, slo_ms: float = 1500.0
) -> bool:
    """
    Stub for checking graph query SLO (p95 < 1.5s).
    """
    print(f"Checking graph query SLO: latency={query_latency_ms}ms, p{p_threshold}={slo_ms}ms")
    return query_latency_ms < slo_ms


def check_ingestion_slo(
    ingestion_time_minutes: float,
    docs_ingested: int,
    slo_minutes: float = 5.0,
    slo_docs: int = 10000,
) -> bool:
    """
    Stub for checking ingestion SLO (10k docs in < 5m).
    """
    print(
        f"Checking ingestion SLO: {docs_ingested} docs in {ingestion_time_minutes} min, SLO: {slo_docs} docs in {slo_minutes} min"
    )
    return ingestion_time_minutes < slo_minutes and docs_ingested >= slo_docs


def generate_latency_histogram(data_points: list[float]) -> dict[str, Any]:
    """
    Stub for generating latency histograms.
    """
    print(f"Generating latency histogram for {len(data_points)} data points.")
    return {"bins": [0, 500, 1000, 1500, 2000], "counts": [10, 5, 2, 1, 0]}  # Example


def generate_heatmap(data_matrix: list[list[float]]) -> dict[str, Any]:
    """
    Stub for generating heatmaps.
    """
    print(f"Generating heatmap for {len(data_matrix)}x{len(data_matrix[0])} matrix.")
    return {"type": "heatmap_data", "data": data_matrix}  # Example
