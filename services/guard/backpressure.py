#!/usr/bin/env python3
"""
MC Platform v0.3.4 - Budget Guard Backpressure Hook
Persisted-only backpressure enforcement with intelligent throttling
"""

import asyncio
import hashlib
import json
import logging
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class QueryRequest:
    """GraphQL query request with metadata"""

    query_id: str
    tenant_id: str
    query_hash: str
    is_persisted: bool
    priority: int
    timestamp: datetime
    estimated_cost: float


@dataclass
class BackpressureConfig:
    """Backpressure configuration"""

    enabled: bool = True
    persisted_only_mode: bool = True
    max_queue_size: int = 1000
    throttle_factor: float = 0.5
    priority_levels: int = 3
    cost_threshold: float = 100.0


class BackpressureHook:
    """Intelligent backpressure enforcement for budget protection"""

    def __init__(self, config: BackpressureConfig | None = None):
        self.config = config or BackpressureConfig()
        self.request_queue: deque = deque(maxlen=self.config.max_queue_size)
        self.throttled_tenants: dict[str, float] = {}  # tenant_id -> throttle_until_timestamp
        self.persisted_queries: dict[str, str] = {}  # query_hash -> persisted_id
        self.metrics = {
            "total_requests": 0,
            "throttled_requests": 0,
            "blocked_requests": 0,
            "queue_overflows": 0,
        }

        logger.info("Backpressure hook initialized")

    def register_persisted_query(self, query_hash: str, persisted_id: str):
        """Register a persisted query for whitelist"""
        self.persisted_queries[query_hash] = persisted_id
        logger.info(f"Registered persisted query: {persisted_id}")

    def is_persisted_query(self, query_hash: str) -> bool:
        """Check if query is persisted"""
        return query_hash in self.persisted_queries

    def calculate_query_hash(self, query: str) -> str:
        """Calculate hash for GraphQL query"""
        normalized_query = "".join(query.split())  # Remove whitespace
        return hashlib.sha256(normalized_query.encode()).hexdigest()[:16]

    def estimate_query_cost(self, query: str, tenant_id: str) -> float:
        """Estimate query cost for budget planning"""
        # Simplified cost estimation based on query complexity
        cost_factors = {
            "query": 1.0,
            "mutation": 2.0,
            "subscription": 3.0,
            "analytics": 5.0,
            "aggregation": 4.0,
        }

        base_cost = 10.0  # Base cost per query

        # Analyze query for cost factors
        query_lower = query.lower()
        for operation, factor in cost_factors.items():
            if operation in query_lower:
                base_cost *= factor
                break

        # Tenant-specific cost multipliers
        tenant_multipliers = {
            "TENANT_001": 0.8,  # Enterprise discount
            "TENANT_002": 1.0,  # Standard rate
            "TENANT_003": 0.7,  # Enterprise discount
            "TENANT_004": 1.2,  # Starter premium
            "TENANT_005": 1.2,  # Starter premium
        }

        multiplier = tenant_multipliers.get(tenant_id, 1.0)
        return base_cost * multiplier

    def should_apply_backpressure(self, tenant_id: str, estimated_cost: float) -> tuple[bool, str]:
        """Determine if backpressure should be applied"""
        current_time = time.time()

        # Check if tenant is currently throttled
        if tenant_id in self.throttled_tenants:
            if current_time < self.throttled_tenants[tenant_id]:
                return True, "tenant_throttled"
            else:
                # Throttling period expired
                del self.throttled_tenants[tenant_id]

        # Check queue capacity
        if len(self.request_queue) >= self.config.max_queue_size * 0.8:
            return True, "queue_pressure"

        # Check cost threshold
        if estimated_cost > self.config.cost_threshold:
            return True, "high_cost"

        return False, "none"

    def apply_throttling(self, tenant_id: str, duration_seconds: float = 30.0):
        """Apply throttling to a tenant"""
        throttle_until = time.time() + duration_seconds
        self.throttled_tenants[tenant_id] = throttle_until
        self.metrics["throttled_requests"] += 1
        logger.warning(f"Applied throttling to {tenant_id} for {duration_seconds}s")

    async def process_query_request(
        self, query: str, tenant_id: str, variables: dict | None = None
    ) -> dict[str, Any]:
        """Process GraphQL query through backpressure system"""
        self.metrics["total_requests"] += 1
        start_time = time.time()

        try:
            # Calculate query hash and check if persisted
            query_hash = self.calculate_query_hash(query)
            is_persisted = self.is_persisted_query(query_hash)

            # Estimate query cost
            estimated_cost = self.estimate_query_cost(query, tenant_id)

            # Create request object
            request = QueryRequest(
                query_id=f"{tenant_id}_{int(time.time() * 1000)}",
                tenant_id=tenant_id,
                query_hash=query_hash,
                is_persisted=is_persisted,
                priority=self._calculate_priority(tenant_id, is_persisted, estimated_cost),
                timestamp=datetime.now(timezone.utc),
                estimated_cost=estimated_cost,
            )

            # Apply backpressure logic
            if self.config.enabled:
                # Persisted-only mode: block non-persisted queries under pressure
                if self.config.persisted_only_mode and not is_persisted:
                    should_throttle, reason = self.should_apply_backpressure(
                        tenant_id, estimated_cost
                    )
                    if should_throttle:
                        self.metrics["blocked_requests"] += 1
                        return {
                            "success": False,
                            "error": "non_persisted_query_blocked",
                            "message": f"Non-persisted queries blocked due to {reason}",
                            "estimated_cost": estimated_cost,
                            "persisted_query_required": True,
                        }

                # Check for general backpressure
                should_throttle, reason = self.should_apply_backpressure(tenant_id, estimated_cost)
                if should_throttle:
                    if reason == "tenant_throttled":
                        throttle_remaining = self.throttled_tenants[tenant_id] - time.time()
                        return {
                            "success": False,
                            "error": "tenant_throttled",
                            "message": f"Tenant throttled for {throttle_remaining:.1f}s",
                            "retry_after": throttle_remaining,
                        }
                    elif reason == "queue_pressure":
                        # Apply dynamic throttling based on queue pressure
                        throttle_duration = min(60.0, len(self.request_queue) / 10)
                        self.apply_throttling(tenant_id, throttle_duration)
                        return {
                            "success": False,
                            "error": "queue_pressure",
                            "message": "High queue pressure, throttling applied",
                            "retry_after": throttle_duration,
                        }
                    elif reason == "high_cost":
                        # High-cost queries get special handling
                        self.apply_throttling(tenant_id, 15.0)
                        return {
                            "success": False,
                            "error": "high_cost_query",
                            "message": f"Query cost ${estimated_cost:.2f} exceeds threshold",
                            "estimated_cost": estimated_cost,
                            "optimization_suggested": True,
                        }

            # Add to processing queue
            if len(self.request_queue) >= self.config.max_queue_size:
                self.metrics["queue_overflows"] += 1
                # Remove oldest request to make room
                self.request_queue.popleft()

            self.request_queue.append(request)

            # Simulate query processing
            processing_time = await self._simulate_query_processing(request)

            processing_duration = time.time() - start_time

            return {
                "success": True,
                "query_id": request.query_id,
                "is_persisted": is_persisted,
                "estimated_cost": estimated_cost,
                "processing_time_ms": processing_time * 1000,
                "total_duration_ms": processing_duration * 1000,
                "queue_position": len(self.request_queue),
                "priority": request.priority,
            }

        except Exception as e:
            logger.error(f"Backpressure processing error: {e}")
            return {"success": False, "error": "processing_error", "message": str(e)}

    def _calculate_priority(self, tenant_id: str, is_persisted: bool, estimated_cost: float) -> int:
        """Calculate request priority for queue management"""
        # Priority levels: 1 (highest) to 3 (lowest)

        # Persisted queries get higher priority
        if is_persisted:
            base_priority = 1
        else:
            base_priority = 2

        # Enterprise tenants get priority boost
        if tenant_id in ["TENANT_001", "TENANT_003"]:
            base_priority = max(1, base_priority - 1)

        # High-cost queries get lower priority
        if estimated_cost > self.config.cost_threshold:
            base_priority = min(3, base_priority + 1)

        return base_priority

    async def _simulate_query_processing(self, request: QueryRequest) -> float:
        """Simulate query processing with realistic delays"""
        # Base processing time
        base_time = 0.05  # 50ms

        # Add cost-based delay
        cost_factor = min(2.0, request.estimated_cost / 50.0)
        processing_time = base_time * cost_factor

        # Add priority-based delay
        priority_delays = {1: 0.0, 2: 0.02, 3: 0.05}
        processing_time += priority_delays.get(request.priority, 0.0)

        # Simulate processing
        await asyncio.sleep(processing_time)

        return processing_time

    def get_backpressure_metrics(self) -> dict[str, Any]:
        """Get current backpressure metrics"""
        current_time = time.time()
        active_throttles = sum(1 for t in self.throttled_tenants.values() if t > current_time)

        return {
            "config": {
                "enabled": self.config.enabled,
                "persisted_only_mode": self.config.persisted_only_mode,
                "max_queue_size": self.config.max_queue_size,
                "throttle_factor": self.config.throttle_factor,
            },
            "queue_status": {
                "current_depth": len(self.request_queue),
                "max_depth": self.config.max_queue_size,
                "utilization_percent": (len(self.request_queue) / self.config.max_queue_size) * 100,
            },
            "throttling_status": {
                "active_throttles": active_throttles,
                "total_throttled_tenants": len(self.throttled_tenants),
            },
            "persisted_queries": {
                "registered_count": len(self.persisted_queries),
                "hit_rate_estimate": 85.0,  # Simulated
            },
            "performance_metrics": self.metrics.copy(),
        }


def main():
    """Test the backpressure hook"""
    import asyncio

    async def test_backpressure():
        hook = BackpressureHook()

        # Register some persisted queries
        hook.register_persisted_query("abc123", "getUsers")
        hook.register_persisted_query("def456", "getUserAnalytics")

        # Test queries
        test_cases = [
            # (query, tenant_id, description)
            ("query getUsers { users { id name } }", "TENANT_001", "Persisted query"),
            ("query getAnalytics { analytics { count } }", "TENANT_002", "Non-persisted query"),
            (
                "query expensiveAnalytics { aggregateData { sum count avg } }",
                "TENANT_003",
                "High-cost query",
            ),
            ("mutation createUser { createUser(input: {}) { id } }", "TENANT_004", "Mutation"),
            ("query getUsers { users { id name } }", "TENANT_005", "Persisted query"),
        ]

        print("🔄 Testing Backpressure Hook")
        print("===========================")

        for query, tenant_id, description in test_cases:
            print(f"\n📝 Testing: {description} ({tenant_id})")

            result = await hook.process_query_request(query, tenant_id)

            if result["success"]:
                print(f"  ✅ Success: {result['processing_time_ms']:.1f}ms")
                print(f"     Cost: ${result['estimated_cost']:.2f}")
                print(f"     Persisted: {result['is_persisted']}")
                print(f"     Priority: {result['priority']}")
            else:
                print(f"  ❌ Blocked: {result['error']}")
                print(f"     Reason: {result['message']}")

        # Show final metrics
        print("\n📊 Final Metrics:")
        metrics = hook.get_backpressure_metrics()
        print(json.dumps(metrics, indent=2))

        # Save evidence
        evidence_path = "evidence/v0.3.4/budgets/backpressure-test.json"
        from pathlib import Path

        Path(evidence_path).parent.mkdir(parents=True, exist_ok=True)
        with open(evidence_path, "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"\n✅ Evidence saved: {evidence_path}")

    # Run the test
    asyncio.run(test_backpressure())


if __name__ == "__main__":
    main()
