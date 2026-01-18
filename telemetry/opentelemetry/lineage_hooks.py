"""
OpenTelemetry hook to inject OpenLineage IDs into Spans.
This allows pivoting from Traces -> Lineage.
"""

from opentelemetry import trace

def add_lineage_attributes(span: trace.Span, run_id: str, job_name: str, job_namespace: str, dataset_urns: list = None):
    """
    Adds OpenLineage attributes to the current span.

    Args:
        span: The OTel span to enrich.
        run_id: The OpenLineage run ID.
        job_name: The OpenLineage job name.
        job_namespace: The OpenLineage job namespace.
        dataset_urns: Optional list of dataset URNs involved in this unit of work.
    """
    if not span or not span.is_recording():
        return

    span.set_attribute("ol.run_id", run_id)
    span.set_attribute("ol.job_name", job_name)
    span.set_attribute("ol.job_namespace", job_namespace)

    if dataset_urns:
        span.set_attribute("ol.dataset_urns", dataset_urns)

class LineageSpanProcessor:
    """
    Example processor (concept) if one wanted to auto-inject from context.
    For now, manual instrumentation via 'add_lineage_attributes' is the drop-in.
    """
    pass
