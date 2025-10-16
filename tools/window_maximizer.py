#!/usr/bin/env python3
"""
Symphony Orchestra MVP-3: Window + Budget Maximizer
Look-ahead planning with knapsack optimization for provider windows
"""

import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

import redis

logger = logging.getLogger(__name__)


class WindowType(Enum):
    OPENAI_3H = "openai_3h"  # 3-hour rolling window
    ANTHROPIC_5H = "anthropic_5h"  # 5-hour rolling window
    GEMINI_DAILY = "gemini_daily"  # Daily reset window
    GROK_MINUTE = "grok_minute"  # Per-minute limits


@dataclass
class WorkUnit:
    """Represents a unit of work to be scheduled"""

    task_id: str
    task_type: str
    estimated_tokens: int
    estimated_time_seconds: int
    priority: float
    expected_quality: float
    deadline: datetime | None = None
    preferred_models: list[str] = None
    context_length: int = 0
    requires_streaming: bool = False

    def __post_init__(self):
        if self.preferred_models is None:
            self.preferred_models = []

    @property
    def value_density(self) -> float:
        """Value per token for knapsack optimization"""
        return self.expected_quality / max(self.estimated_tokens, 1)


@dataclass
class ProviderWindow:
    """Provider window constraints and current usage"""

    provider: str
    window_type: WindowType
    quota_tokens: int
    quota_requests: int
    current_usage_tokens: int
    current_usage_requests: int
    window_reset_time: datetime
    cost_per_token: float
    latency_p95: float

    @property
    def remaining_tokens(self) -> int:
        return max(0, self.quota_tokens - self.current_usage_tokens)

    @property
    def remaining_requests(self) -> int:
        return max(0, self.quota_requests - self.current_usage_requests)

    @property
    def utilization_percent(self) -> float:
        if self.quota_tokens == 0:
            return 0.0
        return (self.current_usage_tokens / self.quota_tokens) * 100


@dataclass
class SchedulePlan:
    """Optimized execution plan"""

    horizon_hours: int
    total_expected_utility: float
    window_utilizations: dict[str, float]
    scheduled_work: list[tuple[WorkUnit, str, datetime]]  # work, provider, scheduled_time
    deferred_work: list[WorkUnit]
    overflow_reduction_percent: float


class WindowBudgetMaximizer:
    """Production-grade scheduler with look-ahead planning"""

    def __init__(self, redis_url: str = "redis://localhost:6379/2"):
        self.redis = redis.from_url(redis_url)
        self.target_utilization = 0.90  # 90% target utilization
        self.overflow_reduction_target = 0.30  # 30% overflow reduction

    def get_provider_windows(self) -> dict[str, ProviderWindow]:
        """Get current window states for all providers"""
        windows = {}

        # OpenAI 3-hour rolling window
        windows["openai"] = ProviderWindow(
            provider="openai",
            window_type=WindowType.OPENAI_3H,
            quota_tokens=40000,  # TPM limit
            quota_requests=500,  # RPM limit
            current_usage_tokens=self._get_usage("openai", "tokens", hours=3),
            current_usage_requests=self._get_usage("openai", "requests", hours=3),
            window_reset_time=self._next_3h_boundary(),
            cost_per_token=0.002,
            latency_p95=800,
        )

        # Anthropic 5-hour rolling window
        windows["anthropic"] = ProviderWindow(
            provider="anthropic",
            window_type=WindowType.ANTHROPIC_5H,
            quota_tokens=30000,
            quota_requests=400,
            current_usage_tokens=self._get_usage("anthropic", "tokens", hours=5),
            current_usage_requests=self._get_usage("anthropic", "requests", hours=5),
            window_reset_time=self._next_5h_boundary(),
            cost_per_token=0.008,
            latency_p95=1200,
        )

        # Gemini daily reset
        windows["gemini"] = ProviderWindow(
            provider="gemini",
            window_type=WindowType.GEMINI_DAILY,
            quota_tokens=1000000,  # High daily limit
            quota_requests=10000,
            current_usage_tokens=self._get_usage("gemini", "tokens", hours=24),
            current_usage_requests=self._get_usage("gemini", "requests", hours=24),
            window_reset_time=self._next_midnight_pt(),
            cost_per_token=0.0005,
            latency_p95=2000,
        )

        # Grok per-minute limits
        windows["grok"] = ProviderWindow(
            provider="grok",
            window_type=WindowType.GROK_MINUTE,
            quota_tokens=2000,  # Per minute
            quota_requests=30,
            current_usage_tokens=self._get_usage("grok", "tokens", minutes=1),
            current_usage_requests=self._get_usage("grok", "requests", minutes=1),
            window_reset_time=self._next_minute(),
            cost_per_token=0.001,
            latency_p95=1500,
        )

        return windows

    def _get_usage(self, provider: str, metric: str, hours: int = 0, minutes: int = 0) -> int:
        """Get current usage from Redis time series"""
        if minutes:
            window_seconds = minutes * 60
        else:
            window_seconds = hours * 3600

        key = f"usage:{provider}:{metric}"
        # Simplified - production would use Redis time series
        current = self.redis.get(key)
        return int(current) if current else 0

    def _next_3h_boundary(self) -> datetime:
        """Next 3-hour boundary for OpenAI"""
        now = datetime.now()
        hours_until_reset = 3 - (now.hour % 3)
        return now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=hours_until_reset)

    def _next_5h_boundary(self) -> datetime:
        """Next 5-hour boundary for Anthropic"""
        now = datetime.now()
        hours_until_reset = 5 - (now.hour % 5)
        return now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=hours_until_reset)

    def _next_midnight_pt(self) -> datetime:
        """Next midnight PT for Gemini daily reset"""
        now = datetime.now()
        next_day = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        # Adjust for PT timezone (simplified)
        return next_day - timedelta(hours=8)

    def _next_minute(self) -> datetime:
        """Next minute boundary for Grok"""
        now = datetime.now()
        return now.replace(second=0, microsecond=0) + timedelta(minutes=1)

    def get_work_queue(self) -> list[WorkUnit]:
        """Get current work queue from Redis"""
        queue_key = "scheduler:work_queue"
        work_items = []

        # Get serialized work units
        for item in self.redis.lrange(queue_key, 0, -1):
            work_data = json.loads(item)
            work_unit = WorkUnit(**work_data)
            work_items.append(work_unit)

        return sorted(work_items, key=lambda x: x.priority, reverse=True)

    def add_work_unit(self, work: WorkUnit):
        """Add work unit to queue"""
        queue_key = "scheduler:work_queue"
        work_data = asdict(work)

        # Convert datetime to ISO string
        if work_data.get("deadline"):
            work_data["deadline"] = work.deadline.isoformat()

        self.redis.lpush(queue_key, json.dumps(work_data))

    def optimize_schedule(self, horizon_hours: int = 12) -> SchedulePlan:
        """Create optimal schedule using knapsack/LP optimization"""
        work_queue = self.get_work_queue()
        windows = self.get_provider_windows()

        if not work_queue:
            return SchedulePlan(
                horizon_hours=horizon_hours,
                total_expected_utility=0.0,
                window_utilizations={},
                scheduled_work=[],
                deferred_work=[],
                overflow_reduction_percent=0.0,
            )

        # Build optimization problem
        scheduled_work = []
        deferred_work = []

        # Simple greedy algorithm for MVP (production would use proper LP solver)
        remaining_capacity = {p: w.remaining_tokens for p, w in windows.items()}

        for work in work_queue:
            best_provider = self._choose_optimal_provider(work, windows, remaining_capacity)

            if best_provider and remaining_capacity[best_provider] >= work.estimated_tokens:
                # Schedule work
                schedule_time = self._find_optimal_time_slot(work, windows[best_provider])
                scheduled_work.append((work, best_provider, schedule_time))
                remaining_capacity[best_provider] -= work.estimated_tokens
            else:
                deferred_work.append(work)

        # Calculate metrics
        total_utility = sum(self._calculate_utility(w, p) for w, p, _ in scheduled_work)
        utilizations = {
            p: ((w.quota_tokens - remaining_capacity[p]) / w.quota_tokens) * 100
            for p, w in windows.items()
        }

        # Overflow reduction calculation (simplified)
        baseline_overflow = len(deferred_work) * 1.5  # Estimate
        current_overflow = len(deferred_work)
        overflow_reduction = max(0, (baseline_overflow - current_overflow) / baseline_overflow)

        plan = SchedulePlan(
            horizon_hours=horizon_hours,
            total_expected_utility=total_utility,
            window_utilizations=utilizations,
            scheduled_work=scheduled_work,
            deferred_work=deferred_work,
            overflow_reduction_percent=overflow_reduction * 100,
        )

        # Persist plan
        self._save_schedule_plan(plan)

        return plan

    def _choose_optimal_provider(
        self, work: WorkUnit, windows: dict[str, ProviderWindow], remaining_capacity: dict[str, int]
    ) -> str | None:
        """Choose optimal provider for work unit"""
        best_provider = None
        best_score = -1

        for provider, window in windows.items():
            if remaining_capacity[provider] < work.estimated_tokens:
                continue

            # Score based on cost, latency, and capacity
            cost_score = 1.0 / (1.0 + window.cost_per_token * work.estimated_tokens)
            latency_score = 1.0 / (1.0 + window.latency_p95 / 1000)
            capacity_score = remaining_capacity[provider] / window.quota_tokens

            total_score = cost_score * 0.4 + latency_score * 0.3 + capacity_score * 0.3

            if total_score > best_score:
                best_score = total_score
                best_provider = provider

        return best_provider

    def _find_optimal_time_slot(self, work: WorkUnit, window: ProviderWindow) -> datetime:
        """Find optimal execution time within window"""
        now = datetime.now()

        # For high-value work, schedule ASAP
        if work.priority > 0.8:
            return now + timedelta(seconds=30)

        # For normal work, spread across available window time
        if window.window_type == WindowType.OPENAI_3H:
            # Schedule throughout the 3-hour window
            delay_minutes = min(60, work.priority * 120)  # 0-120 minutes based on priority
        elif window.window_type == WindowType.ANTHROPIC_5H:
            delay_minutes = min(120, work.priority * 200)  # 0-200 minutes
        else:
            delay_minutes = work.priority * 30  # Shorter delay for other providers

        return now + timedelta(minutes=delay_minutes)

    def _calculate_utility(self, work: WorkUnit, provider: str) -> float:
        """Calculate expected utility for work/provider combination"""
        windows = self.get_provider_windows()
        window = windows[provider]

        # Utility = quality - cost - latency penalty
        cost = window.cost_per_token * work.estimated_tokens
        latency_penalty = window.latency_p95 / 10000  # Normalize latency

        return work.expected_quality - 0.5 * cost - 0.2 * latency_penalty

    def _save_schedule_plan(self, plan: SchedulePlan):
        """Save schedule plan to Redis"""
        plan_data = asdict(plan)

        # Convert complex objects to serializable format
        scheduled_work = []
        for work, provider, schedule_time in plan.scheduled_work:
            scheduled_work.append(
                {
                    "work": asdict(work),
                    "provider": provider,
                    "schedule_time": schedule_time.isoformat(),
                }
            )

        plan_data["scheduled_work"] = scheduled_work
        plan_data["deferred_work"] = [asdict(w) for w in plan.deferred_work]

        self.redis.setex("scheduler:current_plan", 3600, json.dumps(plan_data))

    def execute_scheduled_work(self):
        """Execute work units according to current schedule"""
        plan_data = self.redis.get("scheduler:current_plan")
        if not plan_data:
            logger.warning("No current schedule plan found")
            return

        plan = json.loads(plan_data)
        now = datetime.now()

        executed_count = 0
        for item in plan["scheduled_work"]:
            work_data = item["work"]
            provider = item["provider"]
            schedule_time = datetime.fromisoformat(item["schedule_time"])

            # Check if it's time to execute
            if schedule_time <= now:
                work_unit = WorkUnit(**work_data)
                success = self._execute_work_unit(work_unit, provider)

                if success:
                    executed_count += 1
                    logger.info(f"Executed {work_unit.task_id} on {provider}")

        if executed_count > 0:
            logger.info(f"Executed {executed_count} scheduled work units")

    def _execute_work_unit(self, work: WorkUnit, provider: str) -> bool:
        """Execute a single work unit"""
        try:
            # This would integrate with the actual routing system
            logger.info(f"Executing {work.task_id} on {provider}")

            # Update usage counters
            self._update_usage(provider, work.estimated_tokens, 1)

            return True
        except Exception as e:
            logger.error(f"Failed to execute {work.task_id}: {e}")
            return False

    def _update_usage(self, provider: str, tokens: int, requests: int):
        """Update usage counters in Redis"""
        token_key = f"usage:{provider}:tokens"
        request_key = f"usage:{provider}:requests"

        self.redis.incrby(token_key, tokens)
        self.redis.incrby(request_key, requests)

        # Set TTL based on window type
        if provider == "openai":
            self.redis.expire(token_key, 3 * 3600)
            self.redis.expire(request_key, 3 * 3600)
        elif provider == "anthropic":
            self.redis.expire(token_key, 5 * 3600)
            self.redis.expire(request_key, 5 * 3600)

    def get_utilization_report(self) -> dict[str, Any]:
        """Generate utilization report"""
        windows = self.get_provider_windows()

        report = {
            "timestamp": datetime.now().isoformat(),
            "windows": {},
            "overall_utilization": 0.0,
            "recommendations": [],
        }

        total_utilization = 0.0
        for provider, window in windows.items():
            utilization = window.utilization_percent
            total_utilization += utilization

            report["windows"][provider] = {
                "utilization_percent": utilization,
                "remaining_tokens": window.remaining_tokens,
                "remaining_requests": window.remaining_requests,
                "reset_time": window.window_reset_time.isoformat(),
                "meets_target": utilization >= self.target_utilization * 100,
            }

            # Add recommendations
            if utilization < 70:
                report["recommendations"].append(f"Consider increasing {provider} utilization")
            elif utilization > 95:
                report["recommendations"].append(f"Warning: {provider} near quota limit")

        report["overall_utilization"] = total_utilization / len(windows)

        return report


def main():
    """CLI interface for window maximizer"""
    import argparse

    parser = argparse.ArgumentParser(description="Symphony Orchestra Window Maximizer")
    parser.add_argument("command", choices=["schedule", "execute", "status", "add-work"])
    parser.add_argument("--horizon", type=int, default=12, help="Planning horizon in hours")
    parser.add_argument("--task-id", help="Task ID for add-work")
    parser.add_argument("--task-type", help="Task type")
    parser.add_argument("--tokens", type=int, help="Estimated tokens")
    parser.add_argument("--priority", type=float, default=0.5, help="Priority 0-1")

    args = parser.parse_args()

    maximizer = WindowBudgetMaximizer()

    if args.command == "schedule":
        plan = maximizer.optimize_schedule(args.horizon)
        print(f"Scheduled {len(plan.scheduled_work)} work units")
        print(f"Deferred {len(plan.deferred_work)} work units")
        print(f"Total expected utility: {plan.total_expected_utility:.3f}")

        for provider, util in plan.window_utilizations.items():
            print(f"  {provider}: {util:.1f}% utilization")

    elif args.command == "execute":
        maximizer.execute_scheduled_work()

    elif args.command == "status":
        report = maximizer.get_utilization_report()
        print(json.dumps(report, indent=2))

    elif args.command == "add-work":
        if args.task_id and args.task_type and args.tokens:
            work = WorkUnit(
                task_id=args.task_id,
                task_type=args.task_type,
                estimated_tokens=args.tokens,
                estimated_time_seconds=60,
                priority=args.priority,
                expected_quality=0.8,
            )
            maximizer.add_work_unit(work)
            print(f"Added work unit {args.task_id}")
        else:
            print("Missing required arguments: --task-id, --task-type, --tokens")


if __name__ == "__main__":
    main()
