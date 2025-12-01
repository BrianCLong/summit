"""Metrics collection helper for asynchronous background recording."""

import logging
from prometheus_client import Counter, Histogram

logger = logging.getLogger(__name__)


class MetricsCollector:
    def __init__(self):
        self.request_counter = Counter(
            'deepfake_detection_requests_total',
            'Total detection requests recorded by metrics collector',
            ['detector_type', 'status']
        )
        self.duration_histogram = Histogram(
            'deepfake_detection_duration_seconds',
            'Detection duration recorded by metrics collector',
            ['detector_type']
        )
        self.confidence_histogram = Histogram(
            'deepfake_confidence_score',
            'Confidence scores recorded by metrics collector',
            ['detector_type'],
            buckets=[0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        )

    async def record_detection(self, detector_type: str, confidence: float, processing_time_ms: int):
        logger.info(
            "Recording detection metrics (detector=%s, confidence=%.3f, duration_ms=%d)",
            detector_type,
            confidence,
            processing_time_ms,
        )
        self.request_counter.labels(detector_type=detector_type, status="success").inc()
        self.duration_histogram.labels(detector_type=detector_type).observe(processing_time_ms / 1000)
        self.confidence_histogram.labels(detector_type=detector_type).observe(confidence)
