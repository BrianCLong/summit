"""
Service Level Indicators (SLI) and Service Level Objectives (SLO)
SRE-grade monitoring with error budgets and burn rate alerts
"""

import statistics
import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

from ..utils.logging import get_logger


class SLIType(Enum):
    """Types of Service Level Indicators"""

    AVAILABILITY = "availability"
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    FRESHNESS = "freshness"
    COMPLETENESS = "completeness"
    CORRECTNESS = "correctness"
    DURABILITY = "durability"


class SLOStatus(Enum):
    """SLO compliance status"""

    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    BREACHED = "breached"


class TimeWindow(Enum):
    """Time windows for SLO evaluation"""

    HOUR_1 = "1h"
    HOURS_6 = "6h"
    DAY_1 = "1d"
    DAYS_7 = "7d"
    DAYS_30 = "30d"
    DAYS_90 = "90d"


@dataclass
class SLIDataPoint:
    """Single SLI measurement"""

    timestamp: datetime
    value: float
    success: bool  # For availability/error rate metrics
    labels: dict[str, str] | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["timestamp"] = self.timestamp.isoformat()
        return data


@dataclass
class ServiceLevelIndicator:
    """Definition of a Service Level Indicator"""

    name: str
    sli_type: SLIType
    description: str
    measurement_query: str  # Query or method to collect the metric
    success_criteria: str  # What constitutes success
    labels: dict[str, str] | None = None
    unit: str = ""

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["sli_type"] = self.sli_type.value
        return data


@dataclass
class ServiceLevelObjective:
    """Definition of a Service Level Objective"""

    name: str
    sli_name: str
    target_percentage: float  # Target success rate (e.g., 99.9)
    time_window: TimeWindow
    description: str
    error_budget_policy: str | None = None
    alerting_enabled: bool = True

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["time_window"] = self.time_window.value
        return data


@dataclass
class SLOEvaluation:
    """Result of SLO evaluation"""

    slo_name: str
    evaluation_time: datetime
    time_window: TimeWindow
    target_percentage: float
    actual_percentage: float
    status: SLOStatus
    error_budget_remaining: float  # Percentage of error budget left
    burn_rate: float  # Current error budget burn rate
    total_measurements: int
    successful_measurements: int

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["evaluation_time"] = self.evaluation_time.isoformat()
        data["time_window"] = self.time_window.value
        data["status"] = self.status.value
        return data


class SLICollector:
    """
    Collects SLI measurements and stores them for SLO evaluation
    """

    def __init__(self, max_data_points: int = 100000):
        self.logger = get_logger("sli-collector")
        self.max_data_points = max_data_points

        # Storage for SLI data points
        self.sli_data: dict[str, deque] = defaultdict(lambda: deque(maxlen=max_data_points))
        self.sli_definitions: dict[str, ServiceLevelIndicator] = {}

        # Measurement functions
        self.measurement_functions: dict[str, Callable] = {}

        # Thread safety
        self.lock = threading.RLock()

    def register_sli(self, sli: ServiceLevelIndicator, measurement_func: Callable | None = None):
        """Register a new SLI"""
        with self.lock:
            self.sli_definitions[sli.name] = sli

            if measurement_func:
                self.measurement_functions[sli.name] = measurement_func

            self.logger.info(f"Registered SLI: {sli.name} ({sli.sli_type.value})")

    def record_measurement(
        self,
        sli_name: str,
        value: float,
        success: bool = True,
        labels: dict[str, str] | None = None,
    ):
        """Record a single SLI measurement"""

        if sli_name not in self.sli_definitions:
            self.logger.warning(f"Unknown SLI: {sli_name}")
            return

        data_point = SLIDataPoint(
            timestamp=datetime.now(), value=value, success=success, labels=labels
        )

        with self.lock:
            self.sli_data[sli_name].append(data_point)

        self.logger.debug(f"Recorded {sli_name}: value={value}, success={success}")

    def record_availability(self, sli_name: str, success: bool, response_time: float | None = None):
        """Record availability measurement"""
        value = 1.0 if success else 0.0
        self.record_measurement(sli_name, value, success)

        # Also record latency if provided
        if response_time is not None:
            latency_sli = f"{sli_name}_latency"
            if latency_sli in self.sli_definitions:
                self.record_measurement(latency_sli, response_time, success)

    def record_error_rate(self, sli_name: str, total_requests: int, error_requests: int):
        """Record error rate measurement"""
        if total_requests == 0:
            error_rate = 0.0
            success = True
        else:
            error_rate = error_requests / total_requests
            success = error_rate == 0.0

        self.record_measurement(sli_name, error_rate, success)

    def record_latency_percentile(
        self, sli_name: str, latencies: list[float], percentile: float = 95.0
    ):
        """Record latency percentile measurement"""
        if not latencies:
            return

        percentile_value = statistics.quantiles(latencies, n=100)[int(percentile) - 1]

        # Success criteria could be defined in SLI (e.g., < 500ms)
        sli_def = self.sli_definitions.get(sli_name)
        if sli_def and "ms" in sli_def.success_criteria:
            # Extract threshold from success criteria
            threshold = float(sli_def.success_criteria.replace("< ", "").replace("ms", ""))
            success = percentile_value < threshold
        else:
            success = True  # Default to success if no criteria defined

        self.record_measurement(sli_name, percentile_value, success)

    def get_measurements(
        self, sli_name: str, start_time: datetime | None = None, end_time: datetime | None = None
    ) -> list[SLIDataPoint]:
        """Get SLI measurements for a time range"""

        if sli_name not in self.sli_data:
            return []

        with self.lock:
            measurements = list(self.sli_data[sli_name])

        # Filter by time range if specified
        if start_time or end_time:
            filtered = []
            for measurement in measurements:
                if start_time and measurement.timestamp < start_time:
                    continue
                if end_time and measurement.timestamp > end_time:
                    continue
                filtered.append(measurement)
            measurements = filtered

        return measurements

    def get_success_rate(self, sli_name: str, time_window: TimeWindow) -> float | None:
        """Calculate success rate for a time window"""

        end_time = datetime.now()
        start_time = self._get_start_time(end_time, time_window)

        measurements = self.get_measurements(sli_name, start_time, end_time)

        if not measurements:
            return None

        successful = sum(1 for m in measurements if m.success)
        total = len(measurements)

        return (successful / total) * 100.0 if total > 0 else 0.0

    def _get_start_time(self, end_time: datetime, time_window: TimeWindow) -> datetime:
        """Get start time for a time window"""

        if time_window == TimeWindow.HOUR_1:
            return end_time - timedelta(hours=1)
        elif time_window == TimeWindow.HOURS_6:
            return end_time - timedelta(hours=6)
        elif time_window == TimeWindow.DAY_1:
            return end_time - timedelta(days=1)
        elif time_window == TimeWindow.DAYS_7:
            return end_time - timedelta(days=7)
        elif time_window == TimeWindow.DAYS_30:
            return end_time - timedelta(days=30)
        elif time_window == TimeWindow.DAYS_90:
            return end_time - timedelta(days=90)
        else:
            return end_time - timedelta(days=1)  # Default to 1 day


class SLOManager:
    """
    Manages SLOs, evaluates them, and tracks error budgets
    """

    def __init__(self, sli_collector: SLICollector):
        self.logger = get_logger("slo-manager")
        self.sli_collector = sli_collector

        # SLO definitions
        self.slos: dict[str, ServiceLevelObjective] = {}

        # Evaluation history
        self.evaluation_history: dict[str, list[SLOEvaluation]] = defaultdict(list)
        self.max_history_size = 1000

        # Alert callbacks
        self.alert_callbacks: list[Callable[[SLOEvaluation], None]] = []

        # Background evaluation
        self.evaluation_thread: threading.Thread | None = None
        self.evaluation_active = False
        self.evaluation_interval = 300  # 5 minutes

    def register_slo(self, slo: ServiceLevelObjective):
        """Register a new SLO"""
        if slo.sli_name not in self.sli_collector.sli_definitions:
            raise ValueError(f"SLI {slo.sli_name} not found. Register SLI first.")

        self.slos[slo.name] = slo
        self.logger.info(f"Registered SLO: {slo.name} (target: {slo.target_percentage}%)")

    def evaluate_slo(self, slo_name: str) -> SLOEvaluation | None:
        """Evaluate a single SLO"""

        if slo_name not in self.slos:
            self.logger.warning(f"Unknown SLO: {slo_name}")
            return None

        slo = self.slos[slo_name]

        # Get success rate from SLI collector
        success_rate = self.sli_collector.get_success_rate(slo.sli_name, slo.time_window)

        if success_rate is None:
            self.logger.warning(f"No data available for SLO {slo_name}")
            return None

        # Calculate error budget
        error_budget_consumed = max(0, slo.target_percentage - success_rate)
        error_budget_total = 100.0 - slo.target_percentage
        error_budget_remaining = max(0, error_budget_total - error_budget_consumed)
        error_budget_remaining_pct = (
            (error_budget_remaining / error_budget_total) * 100.0
            if error_budget_total > 0
            else 100.0
        )

        # Calculate burn rate (how fast we're consuming error budget)
        burn_rate = self._calculate_burn_rate(slo_name, slo.time_window)

        # Determine status
        status = self._determine_slo_status(
            success_rate, slo.target_percentage, error_budget_remaining_pct, burn_rate
        )

        # Get measurement counts
        end_time = datetime.now()
        start_time = self.sli_collector._get_start_time(end_time, slo.time_window)
        measurements = self.sli_collector.get_measurements(slo.sli_name, start_time, end_time)

        total_measurements = len(measurements)
        successful_measurements = sum(1 for m in measurements if m.success)

        evaluation = SLOEvaluation(
            slo_name=slo_name,
            evaluation_time=datetime.now(),
            time_window=slo.time_window,
            target_percentage=slo.target_percentage,
            actual_percentage=success_rate,
            status=status,
            error_budget_remaining=error_budget_remaining_pct,
            burn_rate=burn_rate,
            total_measurements=total_measurements,
            successful_measurements=successful_measurements,
        )

        # Store evaluation
        self.evaluation_history[slo_name].append(evaluation)
        if len(self.evaluation_history[slo_name]) > self.max_history_size:
            self.evaluation_history[slo_name].pop(0)

        # Trigger alerts if needed
        if status in [SLOStatus.WARNING, SLOStatus.CRITICAL, SLOStatus.BREACHED]:
            self._trigger_alerts(evaluation)

        self.logger.info(
            f"SLO {slo_name}: {success_rate:.2f}% "
            f"(target: {slo.target_percentage}%, status: {status.value})"
        )

        return evaluation

    def evaluate_all_slos(self) -> dict[str, SLOEvaluation]:
        """Evaluate all registered SLOs"""
        evaluations = {}

        for slo_name in self.slos.keys():
            evaluation = self.evaluate_slo(slo_name)
            if evaluation:
                evaluations[slo_name] = evaluation

        return evaluations

    def start_background_evaluation(self):
        """Start background SLO evaluation"""
        if self.evaluation_active:
            self.logger.warning("Background evaluation already active")
            return

        self.evaluation_active = True
        self.evaluation_thread = threading.Thread(target=self._evaluation_loop, daemon=True)
        self.evaluation_thread.start()

        self.logger.info("Started background SLO evaluation")

    def stop_background_evaluation(self):
        """Stop background SLO evaluation"""
        self.evaluation_active = False
        if self.evaluation_thread:
            self.evaluation_thread.join(timeout=5)

        self.logger.info("Stopped background SLO evaluation")

    def add_alert_callback(self, callback: Callable[[SLOEvaluation], None]):
        """Add callback for SLO alerts"""
        self.alert_callbacks.append(callback)

    def get_slo_dashboard_data(self) -> dict[str, Any]:
        """Get dashboard data for all SLOs"""

        dashboard_data = {
            "timestamp": datetime.now().isoformat(),
            "slos": {},
            "summary": {
                "total_slos": len(self.slos),
                "healthy": 0,
                "warning": 0,
                "critical": 0,
                "breached": 0,
            },
        }

        # Evaluate all SLOs and collect data
        for slo_name in self.slos.keys():
            evaluation = self.evaluate_slo(slo_name)
            if evaluation:
                dashboard_data["slos"][slo_name] = evaluation.to_dict()

                # Update summary counts
                status_count_key = evaluation.status.value
                if status_count_key in dashboard_data["summary"]:
                    dashboard_data["summary"][status_count_key] += 1

        return dashboard_data

    def _calculate_burn_rate(self, slo_name: str, time_window: TimeWindow) -> float:
        """Calculate error budget burn rate"""

        # Get recent evaluations
        recent_evaluations = self.evaluation_history.get(slo_name, [])

        if len(recent_evaluations) < 2:
            return 0.0

        # Compare current vs previous error budget
        current = recent_evaluations[-1]
        previous = recent_evaluations[-2]

        time_diff = (
            current.evaluation_time - previous.evaluation_time
        ).total_seconds() / 3600  # hours
        if time_diff == 0:
            return 0.0

        budget_diff = previous.error_budget_remaining - current.error_budget_remaining
        burn_rate = budget_diff / time_diff  # % per hour

        return max(0.0, burn_rate)

    def _determine_slo_status(
        self,
        actual_percentage: float,
        target_percentage: float,
        error_budget_remaining: float,
        burn_rate: float,
    ) -> SLOStatus:
        """Determine SLO status based on multiple factors"""

        # Breached: Actually below target
        if actual_percentage < target_percentage:
            return SLOStatus.BREACHED

        # Critical: Very low error budget or high burn rate
        if error_budget_remaining < 10.0 or burn_rate > 50.0:
            return SLOStatus.CRITICAL

        # Warning: Low error budget or moderate burn rate
        if error_budget_remaining < 25.0 or burn_rate > 20.0:
            return SLOStatus.WARNING

        # Healthy: All good
        return SLOStatus.HEALTHY

    def _trigger_alerts(self, evaluation: SLOEvaluation):
        """Trigger alerts for SLO violations"""
        for callback in self.alert_callbacks:
            try:
                callback(evaluation)
            except Exception as e:
                self.logger.error(f"Alert callback failed: {e}")

    def _evaluation_loop(self):
        """Background evaluation loop"""
        while self.evaluation_active:
            try:
                self.evaluate_all_slos()
                time.sleep(self.evaluation_interval)
            except Exception as e:
                self.logger.error(f"Error in evaluation loop: {e}")
                time.sleep(60)  # Wait before retrying


# Predefined SLI/SLO configurations for common use cases
def create_pipeline_slis() -> list[ServiceLevelIndicator]:
    """Create standard SLIs for data pipelines"""

    return [
        ServiceLevelIndicator(
            name="pipeline_availability",
            sli_type=SLIType.AVAILABILITY,
            description="Pipeline execution success rate",
            measurement_query="pipeline_runs_successful / pipeline_runs_total",
            success_criteria="Pipeline completes without errors",
        ),
        ServiceLevelIndicator(
            name="pipeline_latency_p95",
            sli_type=SLIType.LATENCY,
            description="95th percentile pipeline execution time",
            measurement_query="quantile(0.95, pipeline_duration_seconds)",
            success_criteria="< 300 seconds",
            unit="seconds",
        ),
        ServiceLevelIndicator(
            name="data_freshness",
            sli_type=SLIType.FRESHNESS,
            description="Time since last successful data update",
            measurement_query="time() - last_successful_update_timestamp",
            success_criteria="< 3600 seconds",
            unit="seconds",
        ),
        ServiceLevelIndicator(
            name="data_completeness",
            sli_type=SLIType.COMPLETENESS,
            description="Percentage of expected records processed",
            measurement_query="records_processed / records_expected",
            success_criteria="> 95%",
            unit="percentage",
        ),
    ]


def create_pipeline_slos() -> list[ServiceLevelObjective]:
    """Create standard SLOs for data pipelines"""

    return [
        ServiceLevelObjective(
            name="pipeline_reliability",
            sli_name="pipeline_availability",
            target_percentage=99.0,
            time_window=TimeWindow.DAYS_30,
            description="Pipeline should be available 99% of the time over 30 days",
            error_budget_policy="Fast burn: alert at 2x rate, Slow burn: alert at 10x rate",
        ),
        ServiceLevelObjective(
            name="pipeline_performance",
            sli_name="pipeline_latency_p95",
            target_percentage=95.0,
            time_window=TimeWindow.DAYS_7,
            description="95% of pipeline runs should complete within 5 minutes",
            error_budget_policy="Page on-call if budget consumed > 50% in 1 hour",
        ),
        ServiceLevelObjective(
            name="data_timeliness",
            sli_name="data_freshness",
            target_percentage=99.5,
            time_window=TimeWindow.DAY_1,
            description="Data should be updated within 1 hour 99.5% of the time",
            error_budget_policy="Alert data team if budget consumed > 25%",
        ),
    ]


# Alert callback examples
def create_slo_alert_handler(
    webhook_url: str | None = None, email_recipients: list[str] | None = None
) -> Callable:
    """Create SLO alert handler"""

    def alert_handler(evaluation: SLOEvaluation):
        """Handle SLO alerts"""
        logger = get_logger("slo-alerts")

        severity_map = {
            SLOStatus.WARNING: "WARNING",
            SLOStatus.CRITICAL: "CRITICAL",
            SLOStatus.BREACHED: "CRITICAL",
        }

        severity = severity_map.get(evaluation.status, "INFO")

        alert_message = {
            "severity": severity,
            "slo_name": evaluation.slo_name,
            "status": evaluation.status.value,
            "actual_percentage": evaluation.actual_percentage,
            "target_percentage": evaluation.target_percentage,
            "error_budget_remaining": evaluation.error_budget_remaining,
            "burn_rate": evaluation.burn_rate,
            "evaluation_time": evaluation.evaluation_time.isoformat(),
            "message": f"SLO {evaluation.slo_name} is {evaluation.status.value}. "
            f"Actual: {evaluation.actual_percentage:.2f}%, "
            f"Target: {evaluation.target_percentage:.2f}%, "
            f"Error Budget: {evaluation.error_budget_remaining:.1f}%",
        }

        logger.warning(f"SLO Alert: {alert_message['message']}")

        # Send webhook notification
        if webhook_url:
            try:
                import requests

                response = requests.post(webhook_url, json=alert_message, timeout=10)
                if response.status_code == 200:
                    logger.info("Alert webhook sent successfully")
                else:
                    logger.warning(f"Alert webhook failed: {response.status_code}")
            except Exception as e:
                logger.error(f"Failed to send webhook alert: {e}")

        # Send email notification (would need email service integration)
        if email_recipients:
            logger.info(f"Would send email alert to: {email_recipients}")

    return alert_handler
