"""
Prometheus metrics collection for IntelGraph ML service
"""
import math
import time
import logging
from typing import TYPE_CHECKING

import psutil
from prometheus_client import (
    CollectorRegistry,
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST
)

if TYPE_CHECKING:  # pragma: no cover - circular import guard for type checkers
    from .drift import DriftResult

logger = logging.getLogger(__name__)

# Create custom registry
registry = CollectorRegistry()

# HTTP metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    registry=registry
)

# ML model metrics
ml_model_predictions_total = Counter(
    'ml_model_predictions_total',
    'Total ML model predictions',
    ['model_type', 'status'],
    registry=registry
)

ml_model_inference_duration_seconds = Histogram(
    'ml_model_inference_duration_seconds',
    'ML model inference duration in seconds',
    ['model_type'],
    buckets=[0.01, 0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0],
    registry=registry
)

ml_model_accuracy = Gauge(
    'ml_model_accuracy',
    'ML model accuracy score',
    ['model_type', 'metric'],
    registry=registry
)

# Drift monitoring metrics powered by Evidently
model_data_drift_share = Gauge(
    'model_data_drift_share',
    'Share of features flagged as drifted by Evidently',
    ['model_name'],
    registry=registry
)

model_data_drift_detected = Gauge(
    'model_data_drift_detected',
    'Indicator (1=yes, 0=no) that model data drift has breached thresholds',
    ['model_name'],
    registry=registry
)

model_data_drift_columns = Gauge(
    'model_data_drift_columns',
    'Number of columns identified as drifted by Evidently',
    ['model_name'],
    registry=registry
)

model_drift_last_run_timestamp = Gauge(
    'model_drift_last_run_timestamp',
    'Unix timestamp of the last Evidently drift evaluation',
    ['model_name'],
    registry=registry
)

model_drift_threshold = Gauge(
    'model_drift_threshold',
    'Configured thresholds for drift and performance monitoring',
    ['model_name', 'threshold_type'],
    registry=registry
)

model_performance_value = Gauge(
    'model_performance_value',
    'Model performance metric value as calculated by Evidently',
    ['model_name', 'dataset', 'metric'],
    registry=registry
)

model_performance_drop_ratio = Gauge(
    'model_performance_drop_ratio',
    'Relative drop between reference and current performance metrics',
    ['model_name', 'metric'],
    registry=registry
)

model_drift_alerts_total = Counter(
    'model_drift_alerts_total',
    'Total number of Evidently driven drift alerts emitted',
    ['model_name', 'alert_type'],
    registry=registry
)

# Task queue metrics
task_queue_length = Gauge(
    'task_queue_length',
    'Number of tasks in queue',
    ['queue_name'],
    registry=registry
)

task_processing_duration_seconds = Histogram(
    'task_processing_duration_seconds',
    'Task processing duration in seconds',
    ['task_type', 'status'],
    buckets=[1.0, 5.0, 10.0, 30.0, 60.0, 300.0, 600.0],
    registry=registry
)

tasks_processed_total = Counter(
    'tasks_processed_total',
    'Total tasks processed',
    ['task_type', 'status'],
    registry=registry
)

# Entity extraction metrics
entities_extracted_total = Counter(
    'entities_extracted_total',
    'Total entities extracted',
    ['source', 'entity_type'],
    registry=registry
)

entity_extraction_confidence = Histogram(
    'entity_extraction_confidence',
    'Entity extraction confidence scores',
    ['source', 'entity_type'],
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    registry=registry
)

# Graph analytics metrics
graph_nodes_processed = Counter(
    'graph_nodes_processed_total',
    'Total graph nodes processed',
    ['operation'],
    registry=registry
)

graph_edges_processed = Counter(
    'graph_edges_processed_total',
    'Total graph edges processed',
    ['operation'],
    registry=registry
)

community_detection_modularity = Gauge(
    'community_detection_modularity',
    'Community detection modularity score',
    ['algorithm'],
    registry=registry
)

link_prediction_accuracy = Gauge(
    'link_prediction_accuracy',
    'Link prediction accuracy',
    ['method'],
    registry=registry
)

# System metrics
cpu_usage_percent = Gauge(
    'cpu_usage_percent',
    'CPU usage percentage',
    registry=registry
)

memory_usage_bytes = Gauge(
    'memory_usage_bytes',
    'Memory usage in bytes',
    ['type'],
    registry=registry
)

gpu_utilization_percent = Gauge(
    'gpu_utilization_percent',
    'GPU utilization percentage',
    ['gpu_id'],
    registry=registry
)

gpu_memory_usage_bytes = Gauge(
    'gpu_memory_usage_bytes',
    'GPU memory usage in bytes',
    ['gpu_id', 'type'],
    registry=registry
)

# Error tracking
errors_total = Counter(
    'errors_total',
    'Total errors',
    ['module', 'error_type', 'severity'],
    registry=registry
)

# Cache metrics
cache_hits_total = Counter(
    'cache_hits_total',
    'Total cache hits',
    ['cache_type'],
    registry=registry
)

cache_misses_total = Counter(
    'cache_misses_total',
    'Total cache misses',
    ['cache_type'],
    registry=registry
)

# Model loading metrics
model_loading_duration_seconds = Histogram(
    'model_loading_duration_seconds',
    'Model loading duration in seconds',
    ['model_type'],
    buckets=[1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0],
    registry=registry
)

models_loaded_total = Counter(
    'models_loaded_total',
    'Total models loaded',
    ['model_type', 'status'],
    registry=registry
)

# Active connections
active_connections = Gauge(
    'active_connections_total',
    'Number of active connections',
    ['connection_type'],
    registry=registry
)


def update_system_metrics():
    """Update system resource metrics"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_usage_percent.set(cpu_percent)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_usage_bytes.labels(type='used').set(memory.used)
        memory_usage_bytes.labels(type='available').set(memory.available)
        memory_usage_bytes.labels(type='total').set(memory.total)
        
        # Process-specific memory
        process = psutil.Process()
        process_memory = process.memory_info()
        memory_usage_bytes.labels(type='process_rss').set(process_memory.rss)
        memory_usage_bytes.labels(type='process_vms').set(process_memory.vms)
        
        # GPU metrics (if available)
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            for i, gpu in enumerate(gpus):
                gpu_utilization_percent.labels(gpu_id=str(i)).set(gpu.load * 100)
                gpu_memory_usage_bytes.labels(gpu_id=str(i), type='used').set(
                    gpu.memoryUsed * 1024 * 1024
                )
                gpu_memory_usage_bytes.labels(gpu_id=str(i), type='total').set(
                    gpu.memoryTotal * 1024 * 1024
                )
        except ImportError:
            # GPUtil not available, skip GPU metrics
            pass
            
    except Exception as e:
        errors_total.labels(
            module='metrics',
            error_type=type(e).__name__,
            severity='warning'
        ).inc()


def track_http_request(method: str, endpoint: str, status_code: int, duration: float):
    """Track HTTP request metrics"""
    http_requests_total.labels(
        method=method,
        endpoint=endpoint,
        status=str(status_code)
    ).inc()
    
    http_request_duration_seconds.labels(
        method=method,
        endpoint=endpoint
    ).observe(duration)


def track_ml_prediction(model_type: str, duration: float, status: str = 'success'):
    """Track ML prediction metrics"""
    ml_model_predictions_total.labels(
        model_type=model_type,
        status=status
    ).inc()
    
    ml_model_inference_duration_seconds.labels(
        model_type=model_type
    ).observe(duration)


def track_task_processing(task_type: str, duration: float, status: str = 'success'):
    """Track task processing metrics"""
    tasks_processed_total.labels(
        task_type=task_type,
        status=status
    ).inc()
    
    task_processing_duration_seconds.labels(
        task_type=task_type,
        status=status
    ).observe(duration)


def track_entity_extraction(source: str, entity_type: str, confidence: float):
    """Track entity extraction metrics"""
    entities_extracted_total.labels(
        source=source,
        entity_type=entity_type
    ).inc()
    
    entity_extraction_confidence.labels(
        source=source,
        entity_type=entity_type
    ).observe(confidence)


def track_graph_operation(operation: str, nodes_count: int, edges_count: int):
    """Track graph operation metrics"""
    graph_nodes_processed.labels(operation=operation).inc(nodes_count)
    graph_edges_processed.labels(operation=operation).inc(edges_count)


def track_error(module: str, error_type: str, severity: str = 'error'):
    """Track error occurrence"""
    errors_total.labels(
        module=module,
        error_type=error_type,
        severity=severity
    ).inc()


def track_cache_operation(cache_type: str, hit: bool):
    """Track cache hit/miss"""
    if hit:
        cache_hits_total.labels(cache_type=cache_type).inc()
    else:
        cache_misses_total.labels(cache_type=cache_type).inc()


def track_model_loading(model_type: str, duration: float, status: str = 'success'):
    """Track model loading metrics"""
    models_loaded_total.labels(
        model_type=model_type,
        status=status
    ).inc()

    model_loading_duration_seconds.labels(
        model_type=model_type
    ).observe(duration)


def record_drift_metrics(
    result: 'DriftResult',
    data_drift_threshold: float,
    performance_drop_threshold: float,
) -> None:
    """Persist Evidently drift metrics to Prometheus."""
    try:
        model_name = result.model_name

        model_data_drift_share.labels(model_name=model_name).set(
            result.share_of_drifted_columns
        )
        model_data_drift_columns.labels(model_name=model_name).set(
            result.number_of_drifted_columns
        )
        model_data_drift_detected.labels(model_name=model_name).set(
            1.0 if result.data_drift_detected else 0.0
        )
        model_drift_last_run_timestamp.labels(model_name=model_name).set(
            result.timestamp
        )

        model_drift_threshold.labels(
            model_name=model_name,
            threshold_type='data_drift'
        ).set(data_drift_threshold)
        model_drift_threshold.labels(
            model_name=model_name,
            threshold_type='performance_drop'
        ).set(performance_drop_threshold)

        for metric_name, dataset_values in result.performance_by_metric.items():
            for dataset, value in dataset_values.items():
                if value is None:
                    continue
                if isinstance(value, float) and math.isnan(value):
                    continue
                model_performance_value.labels(
                    model_name=model_name,
                    dataset=dataset,
                    metric=metric_name
                ).set(value)

        for metric_name, drop_ratio in result.performance_drop.items():
            if drop_ratio is None:
                continue
            if isinstance(drop_ratio, float) and math.isnan(drop_ratio):
                continue
            model_performance_drop_ratio.labels(
                model_name=model_name,
                metric=metric_name
            ).set(drop_ratio)

        for alert_type in result.alerts:
            model_drift_alerts_total.labels(
                model_name=model_name,
                alert_type=alert_type
            ).inc()

    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Failed to record drift metrics: %s", exc)
        errors_total.labels(
            module='metrics',
            error_type=type(exc).__name__,
            severity='error'
        ).inc()


def get_metrics():
    """Get current metrics in Prometheus format"""
    # Update system metrics before generating output
    update_system_metrics()
    return generate_latest(registry)


def get_content_type():
    """Get Prometheus content type"""
    return CONTENT_TYPE_LATEST