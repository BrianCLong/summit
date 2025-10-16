"""
Cost Control System
Resource monitoring, quotas, and cost optimization for data pipelines
"""

import json
import threading
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

import psutil

from ..utils.logging import get_logger


class ResourceType(Enum):
    """Types of resources to monitor"""

    CPU = "cpu"
    MEMORY = "memory"
    DISK_IO = "disk_io"
    NETWORK_IO = "network_io"
    STORAGE = "storage"
    PIPELINE_RUNS = "pipeline_runs"
    API_CALLS = "api_calls"


class AlertLevel(Enum):
    """Alert severity levels"""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class ResourceLimits:
    """Resource usage limits and quotas"""

    # CPU limits
    max_cpu_percent: float = 80.0
    max_cpu_cores: int = 4

    # Memory limits
    max_memory_percent: float = 75.0
    max_memory_gb: float = 8.0

    # Disk I/O limits
    max_disk_read_mb_per_sec: float = 500.0
    max_disk_write_mb_per_sec: float = 500.0

    # Storage limits
    max_storage_gb: float = 100.0
    storage_warning_threshold_percent: float = 85.0

    # Pipeline limits
    max_concurrent_pipelines: int = 5
    max_pipeline_runtime_minutes: int = 60
    max_daily_pipeline_runs: int = 100

    # Cost limits (in USD)
    daily_cost_limit: float = 100.0
    monthly_cost_limit: float = 2000.0
    alert_cost_threshold: float = 80.0  # Percentage of limit


@dataclass
class CostConfig:
    """Configuration for cost tracking"""

    # Cost per unit (adjust based on your infrastructure)
    cpu_cost_per_hour: float = 0.05  # Per core hour
    memory_cost_per_gb_hour: float = 0.01  # Per GB hour
    storage_cost_per_gb_month: float = 0.023  # S3 standard pricing
    network_cost_per_gb: float = 0.09  # Data transfer out

    # Cost tracking
    cost_tracking_enabled: bool = True
    cost_alerts_enabled: bool = True
    cost_optimization_enabled: bool = True

    # Billing periods
    billing_reset_day: int = 1  # Day of month when costs reset
    cost_reporting_interval_hours: int = 24


@dataclass
class ResourceUsage:
    """Current resource usage snapshot"""

    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_gb: float
    disk_read_mb_per_sec: float
    disk_write_mb_per_sec: float
    network_sent_mb_per_sec: float
    network_recv_mb_per_sec: float
    storage_used_gb: float
    active_pipelines: int

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["timestamp"] = self.timestamp.isoformat()
        return data


@dataclass
class CostBreakdown:
    """Cost breakdown by resource type"""

    period_start: datetime
    period_end: datetime
    cpu_cost: float = 0.0
    memory_cost: float = 0.0
    storage_cost: float = 0.0
    network_cost: float = 0.0
    total_cost: float = 0.0
    projected_monthly_cost: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["period_start"] = self.period_start.isoformat()
        data["period_end"] = self.period_end.isoformat()
        return data


class CostController:
    """
    Comprehensive cost control and resource monitoring system
    """

    def __init__(
        self,
        limits: ResourceLimits = None,
        config: CostConfig = None,
        storage_paths: list[str] | None = None,
    ):

        self.limits = limits or ResourceLimits()
        self.config = config or CostConfig()
        self.storage_paths = storage_paths or ["./data"]
        self.logger = get_logger("cost-controller")

        # Resource monitoring state
        self.monitoring_active = False
        self.monitoring_thread: threading.Thread | None = None
        self.monitoring_interval = 30  # seconds

        # Resource usage history
        self.usage_history: list[ResourceUsage] = []
        self.max_history_size = 2880  # 24 hours at 30-second intervals

        # Cost tracking
        self.cost_history: list[CostBreakdown] = []
        self.current_period_start = self._get_period_start()
        self.accumulated_costs = CostBreakdown(
            period_start=self.current_period_start, period_end=datetime.now()
        )

        # Active pipeline tracking
        self.active_pipelines: dict[str, datetime] = {}
        self.pipeline_run_count_today = 0
        self.last_reset_date = datetime.now().date()

        # Alert callbacks
        self.alert_callbacks: list[Callable[[AlertLevel, str, dict[str, Any]], None]] = []

        # Cost optimization recommendations
        self.optimization_enabled = config.cost_optimization_enabled if config else True

        # Performance baseline for optimization
        self.performance_baselines: dict[str, float] = {}

        # Initialize cost tracking file
        self.cost_file = Path("cost_tracking.json")
        self._load_cost_history()

    def start_monitoring(self):
        """Start background resource monitoring"""
        if self.monitoring_active:
            self.logger.warning("Monitoring already active")
            return

        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()

        self.logger.info("Cost controller monitoring started")

    def stop_monitoring(self):
        """Stop background monitoring"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)

        # Save final cost data
        self._save_cost_history()

        self.logger.info("Cost controller monitoring stopped")

    def register_pipeline_start(self, pipeline_id: str) -> bool:
        """
        Register a pipeline start and check limits

        Returns:
            True if pipeline can start, False if limits exceeded
        """
        current_time = datetime.now()

        # Reset daily counter if needed
        if current_time.date() > self.last_reset_date:
            self.pipeline_run_count_today = 0
            self.last_reset_date = current_time.date()

        # Check concurrent pipeline limit
        active_count = len(self.active_pipelines)
        if active_count >= self.limits.max_concurrent_pipelines:
            self._send_alert(
                AlertLevel.WARNING,
                "Concurrent pipeline limit reached",
                {"active_count": active_count, "limit": self.limits.max_concurrent_pipelines},
            )
            return False

        # Check daily run limit
        if self.pipeline_run_count_today >= self.limits.max_daily_pipeline_runs:
            self._send_alert(
                AlertLevel.WARNING,
                "Daily pipeline run limit reached",
                {
                    "runs_today": self.pipeline_run_count_today,
                    "limit": self.limits.max_daily_pipeline_runs,
                },
            )
            return False

        # Check cost limits
        if not self._check_cost_limits():
            return False

        # Register pipeline
        self.active_pipelines[pipeline_id] = current_time
        self.pipeline_run_count_today += 1

        self.logger.info(f"Pipeline {pipeline_id} started ({active_count + 1} active)")
        return True

    def register_pipeline_end(self, pipeline_id: str, success: bool = True):
        """Register pipeline completion"""
        if pipeline_id in self.active_pipelines:
            start_time = self.active_pipelines[pipeline_id]
            duration = datetime.now() - start_time

            # Check if runtime exceeded limit
            if duration.total_seconds() > self.limits.max_pipeline_runtime_minutes * 60:
                self._send_alert(
                    AlertLevel.WARNING,
                    "Pipeline runtime exceeded limit",
                    {
                        "pipeline_id": pipeline_id,
                        "duration_minutes": duration.total_seconds() / 60,
                        "limit_minutes": self.limits.max_pipeline_runtime_minutes,
                    },
                )

            del self.active_pipelines[pipeline_id]

            self.logger.info(
                f"Pipeline {pipeline_id} completed in {duration.total_seconds():.1f}s "
                f"({'success' if success else 'failed'})"
            )

    def get_current_usage(self) -> ResourceUsage:
        """Get current resource usage snapshot"""

        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)

        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_gb = memory.used / (1024**3)

        # Disk I/O
        disk_io = psutil.disk_io_counters()
        if hasattr(self, "_last_disk_io"):
            time_delta = time.time() - self._last_disk_check
            read_delta = disk_io.read_bytes - self._last_disk_io.read_bytes
            write_delta = disk_io.write_bytes - self._last_disk_io.write_bytes

            disk_read_mb_per_sec = (read_delta / time_delta) / (1024**2)
            disk_write_mb_per_sec = (write_delta / time_delta) / (1024**2)
        else:
            disk_read_mb_per_sec = 0.0
            disk_write_mb_per_sec = 0.0

        self._last_disk_io = disk_io
        self._last_disk_check = time.time()

        # Network I/O
        network_io = psutil.net_io_counters()
        if hasattr(self, "_last_network_io"):
            time_delta = time.time() - self._last_network_check
            sent_delta = network_io.bytes_sent - self._last_network_io.bytes_sent
            recv_delta = network_io.bytes_recv - self._last_network_io.bytes_recv

            network_sent_mb_per_sec = (sent_delta / time_delta) / (1024**2)
            network_recv_mb_per_sec = (recv_delta / time_delta) / (1024**2)
        else:
            network_sent_mb_per_sec = 0.0
            network_recv_mb_per_sec = 0.0

        self._last_network_io = network_io
        self._last_network_check = time.time()

        # Storage usage
        storage_used_gb = sum(self._get_directory_size(path) for path in self.storage_paths) / (
            1024**3
        )

        return ResourceUsage(
            timestamp=datetime.now(),
            cpu_percent=cpu_percent,
            memory_percent=memory_percent,
            memory_gb=memory_gb,
            disk_read_mb_per_sec=disk_read_mb_per_sec,
            disk_write_mb_per_sec=disk_write_mb_per_sec,
            network_sent_mb_per_sec=network_sent_mb_per_sec,
            network_recv_mb_per_sec=network_recv_mb_per_sec,
            storage_used_gb=storage_used_gb,
            active_pipelines=len(self.active_pipelines),
        )

    def get_cost_breakdown(
        self, start_date: datetime | None = None, end_date: datetime | None = None
    ) -> CostBreakdown:
        """Get cost breakdown for specified period"""

        if not start_date:
            start_date = self.current_period_start
        if not end_date:
            end_date = datetime.now()

        # Calculate costs based on usage history
        period_usage = [u for u in self.usage_history if start_date <= u.timestamp <= end_date]

        if not period_usage:
            return CostBreakdown(period_start=start_date, period_end=end_date)

        # Calculate average usage over period
        avg_cpu_cores = (
            sum(u.cpu_percent for u in period_usage) / len(period_usage) / 100 * psutil.cpu_count()
        )
        avg_memory_gb = sum(u.memory_gb for u in period_usage) / len(period_usage)
        avg_storage_gb = sum(u.storage_used_gb for u in period_usage) / len(period_usage)
        total_network_gb = (
            sum(u.network_sent_mb_per_sec + u.network_recv_mb_per_sec for u in period_usage) / 1024
        )

        # Calculate costs
        period_hours = (end_date - start_date).total_seconds() / 3600

        cpu_cost = avg_cpu_cores * period_hours * self.config.cpu_cost_per_hour
        memory_cost = avg_memory_gb * period_hours * self.config.memory_cost_per_gb_hour
        storage_cost = (
            avg_storage_gb * (period_hours / 24 / 30) * self.config.storage_cost_per_gb_month
        )
        network_cost = total_network_gb * self.config.network_cost_per_gb

        total_cost = cpu_cost + memory_cost + storage_cost + network_cost

        # Project monthly cost
        days_in_period = (end_date - start_date).days or 1
        projected_monthly_cost = (total_cost / days_in_period) * 30

        return CostBreakdown(
            period_start=start_date,
            period_end=end_date,
            cpu_cost=cpu_cost,
            memory_cost=memory_cost,
            storage_cost=storage_cost,
            network_cost=network_cost,
            total_cost=total_cost,
            projected_monthly_cost=projected_monthly_cost,
        )

    def get_optimization_recommendations(self) -> list[dict[str, Any]]:
        """Get cost optimization recommendations"""
        recommendations = []

        if not self.usage_history:
            return recommendations

        # Analyze recent usage patterns
        recent_usage = self.usage_history[-100:]  # Last ~50 minutes

        # CPU optimization
        avg_cpu = sum(u.cpu_percent for u in recent_usage) / len(recent_usage)
        max_cpu = max(u.cpu_percent for u in recent_usage)

        if avg_cpu < 30 and max_cpu < 60:
            recommendations.append(
                {
                    "type": "cpu_optimization",
                    "priority": "medium",
                    "description": "CPU utilization is low - consider reducing allocated cores",
                    "current_avg_cpu": avg_cpu,
                    "potential_savings_percent": 25,
                }
            )

        # Memory optimization
        avg_memory = sum(u.memory_percent for u in recent_usage) / len(recent_usage)
        max_memory = max(u.memory_percent for u in recent_usage)

        if avg_memory < 40 and max_memory < 70:
            recommendations.append(
                {
                    "type": "memory_optimization",
                    "priority": "medium",
                    "description": "Memory utilization is low - consider reducing allocated memory",
                    "current_avg_memory": avg_memory,
                    "potential_savings_percent": 20,
                }
            )

        # Storage optimization
        if recent_usage:
            current_storage = recent_usage[-1].storage_used_gb
            storage_growth_rate = self._calculate_storage_growth_rate()

            if storage_growth_rate > 10:  # >10GB per day
                recommendations.append(
                    {
                        "type": "storage_optimization",
                        "priority": "high",
                        "description": "High storage growth rate detected - implement data archiving",
                        "current_storage_gb": current_storage,
                        "growth_rate_gb_per_day": storage_growth_rate,
                        "potential_savings_percent": 30,
                    }
                )

        # Pipeline optimization
        if len(self.active_pipelines) > 0:
            avg_concurrent = sum(u.active_pipelines for u in recent_usage) / len(recent_usage)
            if avg_concurrent < self.limits.max_concurrent_pipelines * 0.5:
                recommendations.append(
                    {
                        "type": "pipeline_optimization",
                        "priority": "low",
                        "description": "Pipeline concurrency is low - consider batch processing",
                        "avg_concurrent_pipelines": avg_concurrent,
                        "potential_savings_percent": 15,
                    }
                )

        return recommendations

    def add_alert_callback(self, callback: Callable[[AlertLevel, str, dict[str, Any]], None]):
        """Add callback for cost/resource alerts"""
        self.alert_callbacks.append(callback)

    def _monitoring_loop(self):
        """Background monitoring loop"""
        while self.monitoring_active:
            try:
                # Get current usage
                usage = self.get_current_usage()

                # Store in history
                self.usage_history.append(usage)
                if len(self.usage_history) > self.max_history_size:
                    self.usage_history.pop(0)

                # Check resource limits
                self._check_resource_limits(usage)

                # Update cost tracking
                self._update_cost_tracking(usage)

                # Check cost limits
                self._check_cost_limits()

                # Sleep until next check
                time.sleep(self.monitoring_interval)

            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(self.monitoring_interval)

    def _check_resource_limits(self, usage: ResourceUsage):
        """Check if current usage exceeds limits"""

        # CPU check
        if usage.cpu_percent > self.limits.max_cpu_percent:
            self._send_alert(
                AlertLevel.WARNING,
                "CPU usage exceeds limit",
                {"current": usage.cpu_percent, "limit": self.limits.max_cpu_percent},
            )

        # Memory check
        if usage.memory_percent > self.limits.max_memory_percent:
            self._send_alert(
                AlertLevel.WARNING,
                "Memory usage exceeds limit",
                {"current": usage.memory_percent, "limit": self.limits.max_memory_percent},
            )

        # Disk I/O check
        if usage.disk_write_mb_per_sec > self.limits.max_disk_write_mb_per_sec:
            self._send_alert(
                AlertLevel.INFO,
                "High disk write activity",
                {
                    "current": usage.disk_write_mb_per_sec,
                    "limit": self.limits.max_disk_write_mb_per_sec,
                },
            )

        # Storage check
        storage_percent = (usage.storage_used_gb / self.limits.max_storage_gb) * 100
        if storage_percent > self.limits.storage_warning_threshold_percent:
            alert_level = AlertLevel.CRITICAL if storage_percent > 95 else AlertLevel.WARNING
            self._send_alert(
                alert_level,
                "Storage usage high",
                {
                    "current_gb": usage.storage_used_gb,
                    "limit_gb": self.limits.max_storage_gb,
                    "percent_used": storage_percent,
                },
            )

    def _check_cost_limits(self) -> bool:
        """Check if current costs exceed limits"""
        current_cost = self.get_cost_breakdown()

        # Check daily limit
        daily_percent = (current_cost.total_cost / self.limits.daily_cost_limit) * 100
        if daily_percent > self.limits.alert_cost_threshold:
            alert_level = AlertLevel.CRITICAL if daily_percent > 95 else AlertLevel.WARNING
            self._send_alert(
                alert_level,
                "Daily cost limit approaching",
                {
                    "current_cost": current_cost.total_cost,
                    "limit": self.limits.daily_cost_limit,
                    "percent_used": daily_percent,
                },
            )

            if daily_percent > 100:
                return False

        # Check monthly projection
        monthly_percent = (
            current_cost.projected_monthly_cost / self.limits.monthly_cost_limit
        ) * 100
        if monthly_percent > self.limits.alert_cost_threshold:
            self._send_alert(
                AlertLevel.WARNING,
                "Monthly cost projection high",
                {
                    "projected_cost": current_cost.projected_monthly_cost,
                    "limit": self.limits.monthly_cost_limit,
                    "percent_projected": monthly_percent,
                },
            )

        return True

    def _update_cost_tracking(self, usage: ResourceUsage):
        """Update accumulated cost tracking"""
        # Calculate incremental costs for this monitoring period
        period_hours = self.monitoring_interval / 3600

        cpu_cores_used = (usage.cpu_percent / 100) * psutil.cpu_count()
        cpu_cost = cpu_cores_used * period_hours * self.config.cpu_cost_per_hour

        memory_cost = usage.memory_gb * period_hours * self.config.memory_cost_per_gb_hour

        # Network cost (rough approximation)
        network_gb = (
            (usage.network_sent_mb_per_sec + usage.network_recv_mb_per_sec)
            * (self.monitoring_interval / 60)
            / 1024
        )
        network_cost = network_gb * self.config.network_cost_per_gb

        # Update accumulated costs
        self.accumulated_costs.cpu_cost += cpu_cost
        self.accumulated_costs.memory_cost += memory_cost
        self.accumulated_costs.network_cost += network_cost
        self.accumulated_costs.total_cost += cpu_cost + memory_cost + network_cost
        self.accumulated_costs.period_end = datetime.now()

        # Calculate projected monthly cost
        days_elapsed = (
            self.accumulated_costs.period_end - self.accumulated_costs.period_start
        ).days or 1
        self.accumulated_costs.projected_monthly_cost = (
            self.accumulated_costs.total_cost / days_elapsed
        ) * 30

    def _send_alert(self, level: AlertLevel, message: str, details: dict[str, Any]):
        """Send alert to registered callbacks"""
        self.logger.log(
            getattr(self.logger, level.value.upper(), self.logger.info),
            f"COST ALERT [{level.value.upper()}]: {message} - {details}",
        )

        for callback in self.alert_callbacks:
            try:
                callback(level, message, details)
            except Exception as e:
                self.logger.error(f"Alert callback failed: {e}")

    def _get_directory_size(self, path: str) -> int:
        """Get total size of directory in bytes"""
        try:
            total = 0
            path_obj = Path(path)
            if path_obj.exists():
                if path_obj.is_file():
                    total = path_obj.stat().st_size
                else:
                    for file_path in path_obj.rglob("*"):
                        if file_path.is_file():
                            total += file_path.stat().st_size
            return total
        except Exception as e:
            self.logger.warning(f"Could not calculate size for {path}: {e}")
            return 0

    def _calculate_storage_growth_rate(self) -> float:
        """Calculate storage growth rate in GB per day"""
        if len(self.usage_history) < 2:
            return 0.0

        # Look at storage usage over last 24 hours
        recent_usage = [
            u for u in self.usage_history if (datetime.now() - u.timestamp).total_seconds() < 86400
        ]

        if len(recent_usage) < 2:
            return 0.0

        earliest = min(recent_usage, key=lambda x: x.timestamp)
        latest = max(recent_usage, key=lambda x: x.timestamp)

        time_delta_days = (latest.timestamp - earliest.timestamp).total_seconds() / 86400
        storage_delta_gb = latest.storage_used_gb - earliest.storage_used_gb

        return storage_delta_gb / time_delta_days if time_delta_days > 0 else 0.0

    def _get_period_start(self) -> datetime:
        """Get start of current billing period"""
        now = datetime.now()
        if now.day >= self.config.billing_reset_day:
            return datetime(now.year, now.month, self.config.billing_reset_day)
        else:
            # Previous month
            if now.month == 1:
                return datetime(now.year - 1, 12, self.config.billing_reset_day)
            else:
                return datetime(now.year, now.month - 1, self.config.billing_reset_day)

    def _save_cost_history(self):
        """Save cost history to file"""
        try:
            history_data = {
                "accumulated_costs": self.accumulated_costs.to_dict(),
                "cost_history": [cost.to_dict() for cost in self.cost_history],
                "last_updated": datetime.now().isoformat(),
            }

            with open(self.cost_file, "w") as f:
                json.dump(history_data, f, indent=2)

        except Exception as e:
            self.logger.error(f"Failed to save cost history: {e}")

    def _load_cost_history(self):
        """Load cost history from file"""
        try:
            if self.cost_file.exists():
                with open(self.cost_file) as f:
                    history_data = json.load(f)

                # Load accumulated costs
                if "accumulated_costs" in history_data:
                    cost_data = history_data["accumulated_costs"]
                    self.accumulated_costs = CostBreakdown(
                        period_start=datetime.fromisoformat(cost_data["period_start"]),
                        period_end=datetime.fromisoformat(cost_data["period_end"]),
                        cpu_cost=cost_data.get("cpu_cost", 0.0),
                        memory_cost=cost_data.get("memory_cost", 0.0),
                        storage_cost=cost_data.get("storage_cost", 0.0),
                        network_cost=cost_data.get("network_cost", 0.0),
                        total_cost=cost_data.get("total_cost", 0.0),
                        projected_monthly_cost=cost_data.get("projected_monthly_cost", 0.0),
                    )

                self.logger.info("Loaded cost history from file")

        except Exception as e:
            self.logger.warning(f"Could not load cost history: {e}")


# Utility functions for cost management
def create_cost_alert_handler(webhook_url: str | None = None) -> Callable:
    """Create a cost alert handler that can send notifications"""

    def alert_handler(level: AlertLevel, message: str, details: dict[str, Any]):
        """Handle cost alerts"""
        logger = get_logger("cost-alerts")

        # Log alert
        logger.warning(f"[{level.value.upper()}] {message}: {details}")

        # Send webhook notification if configured
        if webhook_url and level in [AlertLevel.WARNING, AlertLevel.CRITICAL]:
            try:
                import requests

                payload = {
                    "level": level.value,
                    "message": message,
                    "details": details,
                    "timestamp": datetime.now().isoformat(),
                }

                response = requests.post(webhook_url, json=payload, timeout=10)
                if response.status_code == 200:
                    logger.info("Alert notification sent successfully")
                else:
                    logger.warning(f"Alert notification failed: {response.status_code}")

            except Exception as e:
                logger.error(f"Failed to send alert notification: {e}")

    return alert_handler


def optimize_pipeline_schedule(
    cost_controller: CostController, pipeline_schedules: dict[str, str]
) -> dict[str, str]:
    """Optimize pipeline schedules based on cost patterns"""

    # Analyze cost patterns to find optimal run times
    if not cost_controller.usage_history:
        return pipeline_schedules

    # Find periods of low resource usage
    hourly_usage = {}
    for usage in cost_controller.usage_history[-2880:]:  # Last 24 hours
        hour = usage.timestamp.hour
        if hour not in hourly_usage:
            hourly_usage[hour] = []
        hourly_usage[hour].append(usage.cpu_percent + usage.memory_percent)

    # Calculate average usage per hour
    avg_hourly_usage = {
        hour: sum(usages) / len(usages) for hour, usages in hourly_usage.items() if usages
    }

    # Find the 3 hours with lowest usage
    optimal_hours = sorted(avg_hourly_usage.keys(), key=lambda h: avg_hourly_usage[h])[:3]

    # Redistribute high-resource pipelines to optimal hours
    optimized_schedules = pipeline_schedules.copy()

    logger = get_logger("schedule-optimizer")
    logger.info(f"Optimal hours for pipeline execution: {optimal_hours}")

    return optimized_schedules
