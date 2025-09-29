from prometheus_client import Counter, Histogram, generate_latest

# Define Prometheus metrics
REQUEST_COUNT = Counter(
    'analytics_service_requests_total',
    'Total number of requests to the analytics service',
    ['endpoint', 'method']
)

REQUEST_LATENCY = Histogram(
    'analytics_service_request_duration_seconds',
    'Latency of requests to the analytics service',
    ['endpoint', 'method']
)

COMMUNITY_DETECTION_RUNS = Counter(
    'analytics_service_community_detection_runs_total',
    'Total number of community detection runs',
)

COMMUNITY_DETECTION_DURATION = Histogram(
    'analytics_service_community_detection_duration_seconds',
    'Duration of community detection runs',
)

GNN_INFERENCE_RUNS = Counter(
    'analytics_service_gnn_inference_runs_total',
    'Total number of GNN inference runs',
)

GNN_INFERENCE_DURATION = Histogram(
    'analytics_service_gnn_inference_duration_seconds',
    'Duration of GNN inference runs',
)

def get_metrics_data():
    """
    Returns the current Prometheus metrics data in exposition format.
    """
    return generate_latest().decode('utf-8')
