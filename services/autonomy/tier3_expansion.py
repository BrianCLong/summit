#!/usr/bin/env python3
"""
MC Platform v0.3.4 - Autonomy Tier-3 Expansion
Multi-tenant autonomy with comprehensive safety validation for TENANT_004/005
"""

import asyncio
import json
import logging
import sqlite3
import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AutonomyTier(Enum):
    TIER_1 = "tier_1"  # Alert only
    TIER_2 = "tier_2"  # Throttle + automated response
    TIER_3 = "tier_3"  # Full autonomy with safety validation


class SafetyStatus(Enum):
    SAFE = "safe"
    WARNING = "warning"
    CRITICAL = "critical"
    BLOCKED = "blocked"


class ActionType(Enum):
    QUERY_OPTIMIZATION = "query_optimization"
    CACHE_MANAGEMENT = "cache_management"
    LOAD_BALANCING = "load_balancing"
    RESOURCE_SCALING = "resource_scaling"
    ALERT_RESPONSE = "alert_response"
    BUDGET_ADJUSTMENT = "budget_adjustment"


@dataclass
class SafetyCheck:
    """Safety validation check result"""

    check_id: str
    check_type: str
    status: SafetyStatus
    score: float  # 0.0 to 1.0, higher is safer
    reasoning: str
    timestamp: datetime
    metadata: dict[str, Any]


@dataclass
class AutonomousAction:
    """Autonomous action with safety validation"""

    action_id: str
    tenant_id: str
    action_type: ActionType
    description: str
    proposed_changes: dict[str, Any]
    safety_checks: list[SafetyCheck]
    overall_safety_score: float
    status: str  # pending, approved, executed, rejected
    timestamp: datetime
    execution_time: datetime | None = None
    rollback_plan: dict[str, Any] | None = None


@dataclass
class AutonomyConfiguration:
    """Tenant autonomy configuration"""

    tenant_id: str
    tier: AutonomyTier
    enabled: bool
    safety_threshold: float  # Minimum safety score required
    allowed_actions: set[ActionType]
    max_actions_per_hour: int
    compensation_rate_threshold: float  # Maximum acceptable compensation rate
    last_updated: datetime


@dataclass
class TenantMetrics:
    """Tenant performance and safety metrics"""

    tenant_id: str
    success_rate: float
    compensation_rate: float
    avg_response_time_ms: float
    safety_incidents: int
    autonomous_actions_24h: int
    last_incident: datetime | None


class AutonomyTier3Service:
    """Tier-3 autonomy service with comprehensive safety validation"""

    def __init__(self, db_path: str = "services/autonomy/autonomy.db"):
        self.db_path = db_path
        self.db_lock = threading.RLock()
        self.tenant_configs: dict[str, AutonomyConfiguration] = {}
        self.active_actions: dict[str, AutonomousAction] = {}
        self.safety_validators = {}

        # Initialize database and configurations
        self._init_database()
        self._initialize_tenant_configs()
        self._initialize_safety_validators()

        logger.info("Autonomy Tier-3 service initialized")

    def _init_database(self):
        """Initialize SQLite database for autonomy tracking"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tenant_configs (
                    tenant_id TEXT PRIMARY KEY,
                    tier TEXT NOT NULL,
                    enabled BOOLEAN NOT NULL,
                    safety_threshold REAL NOT NULL,
                    allowed_actions TEXT NOT NULL,
                    max_actions_per_hour INTEGER NOT NULL,
                    compensation_rate_threshold REAL NOT NULL,
                    last_updated TEXT NOT NULL
                )
            """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS autonomous_actions (
                    action_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    proposed_changes TEXT NOT NULL,
                    safety_checks TEXT NOT NULL,
                    overall_safety_score REAL NOT NULL,
                    status TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    execution_time TEXT,
                    rollback_plan TEXT
                )
            """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS safety_incidents (
                    incident_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    action_id TEXT,
                    incident_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    resolved BOOLEAN NOT NULL DEFAULT FALSE
                )
            """
            )

            # Create indexes for performance
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_actions_tenant ON autonomous_actions (tenant_id, timestamp)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON safety_incidents (tenant_id, timestamp)"
            )

            conn.commit()

    def _initialize_tenant_configs(self):
        """Initialize autonomy configurations for TENANT_004 and TENANT_005"""
        configs = {
            "TENANT_004": AutonomyConfiguration(
                tenant_id="TENANT_004",
                tier=AutonomyTier.TIER_3,
                enabled=True,
                safety_threshold=0.8,  # High safety requirement
                allowed_actions={
                    ActionType.QUERY_OPTIMIZATION,
                    ActionType.CACHE_MANAGEMENT,
                    ActionType.LOAD_BALANCING,
                },
                max_actions_per_hour=5,
                compensation_rate_threshold=0.005,  # 0.5% max compensation
                last_updated=datetime.now(timezone.utc),
            ),
            "TENANT_005": AutonomyConfiguration(
                tenant_id="TENANT_005",
                tier=AutonomyTier.TIER_3,
                enabled=True,
                safety_threshold=0.85,  # Even higher safety requirement
                allowed_actions={ActionType.CACHE_MANAGEMENT, ActionType.ALERT_RESPONSE},
                max_actions_per_hour=3,
                compensation_rate_threshold=0.003,  # 0.3% max compensation
                last_updated=datetime.now(timezone.utc),
            ),
        }

        # Save to database
        with sqlite3.connect(self.db_path) as conn:
            for config in configs.values():
                conn.execute(
                    """
                    INSERT OR REPLACE INTO tenant_configs
                    (tenant_id, tier, enabled, safety_threshold, allowed_actions,
                     max_actions_per_hour, compensation_rate_threshold, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        config.tenant_id,
                        config.tier.value,
                        config.enabled,
                        config.safety_threshold,
                        json.dumps([action.value for action in config.allowed_actions]),
                        config.max_actions_per_hour,
                        config.compensation_rate_threshold,
                        config.last_updated.isoformat(),
                    ),
                )
            conn.commit()

        self.tenant_configs = configs

    def _initialize_safety_validators(self):
        """Initialize safety validation functions"""
        self.safety_validators = {
            "impact_assessment": self._validate_impact,
            "resource_safety": self._validate_resource_safety,
            "tenant_isolation": self._validate_tenant_isolation,
            "rollback_feasibility": self._validate_rollback_feasibility,
            "compliance_check": self._validate_compliance,
            "performance_impact": self._validate_performance_impact,
        }

    async def propose_autonomous_action(
        self,
        tenant_id: str,
        action_type: ActionType,
        description: str,
        proposed_changes: dict[str, Any],
    ) -> str:
        """Propose an autonomous action with safety validation"""

        if tenant_id not in self.tenant_configs:
            raise ValueError(f"Tenant {tenant_id} not configured for autonomy")

        config = self.tenant_configs[tenant_id]

        if not config.enabled:
            raise ValueError(f"Autonomy disabled for {tenant_id}")

        if action_type not in config.allowed_actions:
            raise ValueError(f"Action type {action_type.value} not allowed for {tenant_id}")

        # Check rate limits
        if not await self._check_rate_limits(tenant_id):
            raise ValueError(f"Rate limit exceeded for {tenant_id}")

        action_id = f"action_{tenant_id}_{int(time.time() * 1000)}"

        # Perform comprehensive safety validation
        safety_checks = await self._perform_safety_validation(
            tenant_id, action_type, proposed_changes
        )

        # Calculate overall safety score
        overall_safety_score = sum(check.score for check in safety_checks) / len(safety_checks)

        # Generate rollback plan
        rollback_plan = self._generate_rollback_plan(action_type, proposed_changes)

        action = AutonomousAction(
            action_id=action_id,
            tenant_id=tenant_id,
            action_type=action_type,
            description=description,
            proposed_changes=proposed_changes,
            safety_checks=safety_checks,
            overall_safety_score=overall_safety_score,
            status="pending",
            timestamp=datetime.now(timezone.utc),
            rollback_plan=rollback_plan,
        )

        # Auto-approve if safety score meets threshold
        if overall_safety_score >= config.safety_threshold:
            action.status = "approved"
            logger.info(
                f"Auto-approved action {action_id} for {tenant_id} (safety: {overall_safety_score:.3f})"
            )
        else:
            action.status = "rejected"
            logger.warning(
                f"Rejected action {action_id} for {tenant_id} (safety: {overall_safety_score:.3f})"
            )

        # Save to database
        await self._save_action(action)
        self.active_actions[action_id] = action

        return action_id

    async def _perform_safety_validation(
        self, tenant_id: str, action_type: ActionType, proposed_changes: dict[str, Any]
    ) -> list[SafetyCheck]:
        """Perform comprehensive safety validation"""
        checks = []

        for check_name, validator_func in self.safety_validators.items():
            check = await validator_func(tenant_id, action_type, proposed_changes)
            checks.append(check)

        return checks

    async def _validate_impact(
        self, tenant_id: str, action_type: ActionType, proposed_changes: dict[str, Any]
    ) -> SafetyCheck:
        """Validate potential impact of the action"""

        # Simulate impact assessment
        impact_factors = {
            ActionType.QUERY_OPTIMIZATION: 0.1,
            ActionType.CACHE_MANAGEMENT: 0.05,
            ActionType.LOAD_BALANCING: 0.15,
            ActionType.RESOURCE_SCALING: 0.3,
            ActionType.ALERT_RESPONSE: 0.02,
            ActionType.BUDGET_ADJUSTMENT: 0.2,
        }

        base_impact = impact_factors.get(action_type, 0.1)
        change_magnitude = len(str(proposed_changes)) / 1000  # Rough complexity measure
        total_impact = min(1.0, base_impact + change_magnitude)

        safety_score = 1.0 - total_impact
        status = (
            SafetyStatus.SAFE
            if safety_score > 0.8
            else SafetyStatus.WARNING if safety_score > 0.6 else SafetyStatus.CRITICAL
        )

        return SafetyCheck(
            check_id=f"impact_{int(time.time() * 1000)}",
            check_type="impact_assessment",
            status=status,
            score=safety_score,
            reasoning=f"Estimated impact level: {total_impact:.3f}, complexity: {change_magnitude:.3f}",
            timestamp=datetime.now(timezone.utc),
            metadata={"impact_level": total_impact, "change_complexity": change_magnitude},
        )

    async def _validate_resource_safety(
        self, tenant_id: str, action_type: ActionType, proposed_changes: dict[str, Any]
    ) -> SafetyCheck:
        """Validate resource safety constraints"""

        # Check resource bounds
        resource_safe = True
        reasoning = "Resource constraints validated"

        if "cpu_limit" in proposed_changes:
            cpu_limit = proposed_changes["cpu_limit"]
            if cpu_limit > 8.0:  # 8 CPU limit
                resource_safe = False
                reasoning = f"CPU limit {cpu_limit} exceeds maximum (8.0)"

        if "memory_limit" in proposed_changes:
            memory_limit = proposed_changes["memory_limit"]
            if memory_limit > 16384:  # 16GB limit
                resource_safe = False
                reasoning = f"Memory limit {memory_limit}MB exceeds maximum (16384MB)"

        safety_score = 1.0 if resource_safe else 0.2
        status = SafetyStatus.SAFE if resource_safe else SafetyStatus.CRITICAL

        return SafetyCheck(
            check_id=f"resource_{int(time.time() * 1000)}",
            check_type="resource_safety",
            status=status,
            score=safety_score,
            reasoning=reasoning,
            timestamp=datetime.now(timezone.utc),
            metadata={"resource_bounds_ok": resource_safe},
        )

    async def _validate_tenant_isolation(
        self, tenant_id: str, action_type: ActionType, proposed_changes: dict[str, Any]
    ) -> SafetyCheck:
        """Validate tenant isolation is maintained"""

        # Check for cross-tenant impact
        isolation_safe = True
        reasoning = "Tenant isolation maintained"

        # Actions that could affect other tenants
        cross_tenant_actions = {ActionType.LOAD_BALANCING, ActionType.RESOURCE_SCALING}

        if action_type in cross_tenant_actions:
            isolation_safe = len(proposed_changes) < 5  # Simple heuristic
            if not isolation_safe:
                reasoning = "Complex cross-tenant action may affect isolation"

        safety_score = 0.95 if isolation_safe else 0.6
        status = SafetyStatus.SAFE if isolation_safe else SafetyStatus.WARNING

        return SafetyCheck(
            check_id=f"isolation_{int(time.time() * 1000)}",
            check_type="tenant_isolation",
            status=status,
            score=safety_score,
            reasoning=reasoning,
            timestamp=datetime.now(timezone.utc),
            metadata={"cross_tenant_risk": action_type in cross_tenant_actions},
        )

    async def _validate_rollback_feasibility(
        self, tenant_id: str, action_type: ActionType, proposed_changes: dict[str, Any]
    ) -> SafetyCheck:
        """Validate that the action can be rolled back"""

        # Check rollback feasibility
        rollbackable_actions = {
            ActionType.QUERY_OPTIMIZATION,
            ActionType.CACHE_MANAGEMENT,
            ActionType.LOAD_BALANCING,
            ActionType.BUDGET_ADJUSTMENT,
        }

        is_rollbackable = action_type in rollbackable_actions

        # Check for irreversible changes
        irreversible_keys = ["delete", "purge", "destroy"]
        has_irreversible = any(key in str(proposed_changes).lower() for key in irreversible_keys)

        rollback_safe = is_rollbackable and not has_irreversible
        safety_score = 1.0 if rollback_safe else 0.3
        status = SafetyStatus.SAFE if rollback_safe else SafetyStatus.CRITICAL

        reasoning = "Fully rollbackable" if rollback_safe else "Contains irreversible changes"

        return SafetyCheck(
            check_id=f"rollback_{int(time.time() * 1000)}",
            check_type="rollback_feasibility",
            status=status,
            score=safety_score,
            reasoning=reasoning,
            timestamp=datetime.now(timezone.utc),
            metadata={"rollbackable": rollback_safe, "irreversible_detected": has_irreversible},
        )

    async def _validate_compliance(
        self, tenant_id: str, action_type: ActionType, proposed_changes: dict[str, Any]
    ) -> SafetyCheck:
        """Validate compliance requirements"""

        # Check compliance constraints
        compliance_violations = []

        # Data residency check
        if "region" in proposed_changes:
            allowed_regions = ["us-east-1", "us-west-2", "eu-west-1"]
            if proposed_changes["region"] not in allowed_regions:
                compliance_violations.append("Invalid region for data residency")

        # Privacy constraints
        if "data_access" in proposed_changes:
            if proposed_changes["data_access"].get("pii_access", False):
                compliance_violations.append("PII access requires manual approval")

        compliance_safe = len(compliance_violations) == 0
        safety_score = 1.0 if compliance_safe else 0.1
        status = SafetyStatus.SAFE if compliance_safe else SafetyStatus.CRITICAL

        reasoning = (
            "All compliance checks passed"
            if compliance_safe
            else f"Violations: {', '.join(compliance_violations)}"
        )

        return SafetyCheck(
            check_id=f"compliance_{int(time.time() * 1000)}",
            check_type="compliance_check",
            status=status,
            score=safety_score,
            reasoning=reasoning,
            timestamp=datetime.now(timezone.utc),
            metadata={"violations": compliance_violations},
        )

    async def _validate_performance_impact(
        self, tenant_id: str, action_type: ActionType, proposed_changes: dict[str, Any]
    ) -> SafetyCheck:
        """Validate performance impact"""

        # Estimate performance impact
        performance_impact = 0.0

        if action_type == ActionType.QUERY_OPTIMIZATION:
            performance_impact = -0.1  # Positive impact (negative = good)
        elif action_type == ActionType.CACHE_MANAGEMENT:
            performance_impact = -0.05
        elif action_type == ActionType.RESOURCE_SCALING:
            scale_factor = proposed_changes.get("scale_factor", 1.0)
            performance_impact = (scale_factor - 1.0) * 0.1

        # Convert to safety score (lower impact = higher safety)
        safety_score = max(0.0, 1.0 - abs(performance_impact))
        status = SafetyStatus.SAFE if safety_score > 0.8 else SafetyStatus.WARNING

        reasoning = f"Estimated performance impact: {performance_impact:+.3f}"

        return SafetyCheck(
            check_id=f"performance_{int(time.time() * 1000)}",
            check_type="performance_impact",
            status=status,
            score=safety_score,
            reasoning=reasoning,
            timestamp=datetime.now(timezone.utc),
            metadata={"performance_impact": performance_impact},
        )

    async def _check_rate_limits(self, tenant_id: str) -> bool:
        """Check if tenant is within rate limits"""
        config = self.tenant_configs[tenant_id]

        # Count actions in the last hour
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

            cursor.execute(
                """
                SELECT COUNT(*) FROM autonomous_actions
                WHERE tenant_id = ? AND timestamp > ?
            """,
                (tenant_id, one_hour_ago),
            )

            action_count = cursor.fetchone()[0]

        return action_count < config.max_actions_per_hour

    def _generate_rollback_plan(
        self, action_type: ActionType, proposed_changes: dict[str, Any]
    ) -> dict[str, Any]:
        """Generate rollback plan for the action"""
        rollback_plan = {
            "action_type": "rollback",
            "original_action": action_type.value,
            "rollback_steps": [],
        }

        # Generate specific rollback steps based on action type
        if action_type == ActionType.QUERY_OPTIMIZATION:
            rollback_plan["rollback_steps"] = [
                "Restore original query execution plan",
                "Clear optimized query cache",
                "Reset query statistics",
            ]
        elif action_type == ActionType.CACHE_MANAGEMENT:
            rollback_plan["rollback_steps"] = [
                "Restore previous cache configuration",
                "Rebuild cache with original settings",
            ]
        elif action_type == ActionType.LOAD_BALANCING:
            rollback_plan["rollback_steps"] = [
                "Restore original load balancing weights",
                "Drain connections gradually",
                "Validate service health",
            ]

        # Store original values for rollback
        rollback_plan["original_values"] = proposed_changes.copy()
        rollback_plan["estimated_rollback_time_minutes"] = 5

        return rollback_plan

    async def execute_action(self, action_id: str) -> bool:
        """Execute an approved autonomous action"""
        if action_id not in self.active_actions:
            logger.error(f"Action {action_id} not found")
            return False

        action = self.active_actions[action_id]

        if action.status != "approved":
            logger.error(f"Action {action_id} not approved for execution")
            return False

        try:
            # Simulate action execution
            logger.info(f"Executing action {action_id}: {action.description}")

            # Simulate execution time
            await asyncio.sleep(0.1)

            # Update action status
            action.status = "executed"
            action.execution_time = datetime.now(timezone.utc)

            # Save to database
            await self._save_action(action)

            logger.info(f"Successfully executed action {action_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to execute action {action_id}: {e}")
            action.status = "failed"
            await self._save_action(action)
            return False

    async def _save_action(self, action: AutonomousAction):
        """Save action to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO autonomous_actions
                (action_id, tenant_id, action_type, description, proposed_changes,
                 safety_checks, overall_safety_score, status, timestamp,
                 execution_time, rollback_plan)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    action.action_id,
                    action.tenant_id,
                    action.action_type.value,
                    action.description,
                    json.dumps(action.proposed_changes),
                    json.dumps([asdict(check) for check in action.safety_checks], default=str),
                    action.overall_safety_score,
                    action.status,
                    action.timestamp.isoformat(),
                    action.execution_time.isoformat() if action.execution_time else None,
                    json.dumps(action.rollback_plan) if action.rollback_plan else None,
                ),
            )
            conn.commit()

    def get_tenant_metrics(self, tenant_id: str) -> TenantMetrics:
        """Get current tenant metrics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Count recent actions
            cursor.execute(
                """
                SELECT COUNT(*) FROM autonomous_actions
                WHERE tenant_id = ? AND timestamp > ?
            """,
                (tenant_id, (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()),
            )
            actions_24h = cursor.fetchone()[0]

            # Count safety incidents
            cursor.execute(
                """
                SELECT COUNT(*) FROM safety_incidents
                WHERE tenant_id = ? AND resolved = FALSE
            """,
                (tenant_id,),
            )
            safety_incidents = cursor.fetchone()[0]

        # Simulate other metrics
        return TenantMetrics(
            tenant_id=tenant_id,
            success_rate=99.5 if tenant_id == "TENANT_004" else 99.7,
            compensation_rate=0.002 if tenant_id == "TENANT_004" else 0.001,
            avg_response_time_ms=85.0 if tenant_id == "TENANT_004" else 92.0,
            safety_incidents=safety_incidents,
            autonomous_actions_24h=actions_24h,
            last_incident=None,  # No recent incidents in demo
        )

    def get_autonomy_report(self) -> dict[str, Any]:
        """Generate comprehensive autonomy report"""
        report = {
            "report_metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "platform_version": "v0.3.4-mc",
                "report_type": "autonomy_tier3",
            },
            "tenant_configs": {},
            "tenant_metrics": {},
            "safety_summary": {
                "total_actions": len(self.active_actions),
                "approved_actions": len(
                    [a for a in self.active_actions.values() if a.status == "approved"]
                ),
                "executed_actions": len(
                    [a for a in self.active_actions.values() if a.status == "executed"]
                ),
                "avg_safety_score": 0.0,
            },
        }

        # Get metrics for each configured tenant
        for tenant_id in self.tenant_configs.keys():
            report["tenant_configs"][tenant_id] = {
                "tier": self.tenant_configs[tenant_id].tier.value,
                "enabled": self.tenant_configs[tenant_id].enabled,
                "safety_threshold": self.tenant_configs[tenant_id].safety_threshold,
                "allowed_actions": [
                    action.value for action in self.tenant_configs[tenant_id].allowed_actions
                ],
                "max_actions_per_hour": self.tenant_configs[tenant_id].max_actions_per_hour,
            }

            metrics = self.get_tenant_metrics(tenant_id)
            report["tenant_metrics"][tenant_id] = asdict(metrics)

        # Calculate average safety score
        if self.active_actions:
            total_safety = sum(
                action.overall_safety_score for action in self.active_actions.values()
            )
            report["safety_summary"]["avg_safety_score"] = total_safety / len(self.active_actions)

        return report


async def main():
    """Test the autonomy tier-3 service"""
    service = AutonomyTier3Service()

    print("🤖 Testing Autonomy Tier-3 Expansion")
    print("====================================")

    # Test scenarios for TENANT_004 and TENANT_005
    test_scenarios = [
        {
            "tenant_id": "TENANT_004",
            "action_type": ActionType.QUERY_OPTIMIZATION,
            "description": "Optimize slow analytics query",
            "changes": {
                "query_plan": "index_scan",
                "cache_strategy": "aggressive",
                "timeout_ms": 30000,
            },
        },
        {
            "tenant_id": "TENANT_004",
            "action_type": ActionType.CACHE_MANAGEMENT,
            "description": "Clear stale cache entries",
            "changes": {
                "cache_operation": "selective_clear",
                "max_age_hours": 24,
                "preserve_hot_keys": True,
            },
        },
        {
            "tenant_id": "TENANT_005",
            "action_type": ActionType.CACHE_MANAGEMENT,
            "description": "Optimize cache configuration",
            "changes": {"cache_size_mb": 512, "eviction_policy": "lru", "ttl_seconds": 3600},
        },
        {
            "tenant_id": "TENANT_005",
            "action_type": ActionType.ALERT_RESPONSE,
            "description": "Auto-respond to high latency alert",
            "changes": {
                "response_action": "scale_out",
                "scale_factor": 1.2,
                "cooldown_minutes": 15,
            },
        },
    ]

    action_ids = []

    # Test action proposals
    for i, scenario in enumerate(test_scenarios):
        print(f"\n🔄 Test {i+1}: {scenario['description']} ({scenario['tenant_id']})")

        try:
            action_id = await service.propose_autonomous_action(
                tenant_id=scenario["tenant_id"],
                action_type=scenario["action_type"],
                description=scenario["description"],
                proposed_changes=scenario["changes"],
            )

            action = service.active_actions[action_id]
            print(f"  Action ID: {action_id}")
            print(f"  Safety Score: {action.overall_safety_score:.3f}")
            print(f"  Status: {action.status}")
            print(f"  Safety Checks: {len(action.safety_checks)}")

            action_ids.append(action_id)

            # Execute if approved
            if action.status == "approved":
                success = await service.execute_action(action_id)
                print(f"  Execution: {'✅ Success' if success else '❌ Failed'}")

        except Exception as e:
            print(f"  ❌ Error: {e}")

    # Test safety validation
    print("\n🛡️ Safety Validation Summary:")
    for action_id in action_ids:
        if action_id in service.active_actions:
            action = service.active_actions[action_id]
            print(f"  {action.tenant_id}: {action.overall_safety_score:.3f} safety score")
            for check in action.safety_checks:
                print(f"    - {check.check_type}: {check.score:.3f} ({check.status.value})")

    # Test tenant metrics
    print("\n📊 Tenant Metrics:")
    for tenant_id in ["TENANT_004", "TENANT_005"]:
        metrics = service.get_tenant_metrics(tenant_id)
        print(f"  {tenant_id}:")
        print(f"    Success Rate: {metrics.success_rate:.1f}%")
        print(f"    Compensation Rate: {metrics.compensation_rate:.3f}%")
        print(f"    Actions (24h): {metrics.autonomous_actions_24h}")
        print(f"    Safety Incidents: {metrics.safety_incidents}")

    # Generate comprehensive report
    print("\n📋 Autonomy Report:")
    report = service.get_autonomy_report()
    print(json.dumps(report, indent=2, default=str))

    # Save evidence
    evidence_path = "evidence/v0.3.4/autonomy/tier3-expansion-test.json"
    Path(evidence_path).parent.mkdir(parents=True, exist_ok=True)
    with open(evidence_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\n✅ Evidence saved: {evidence_path}")


if __name__ == "__main__":
    asyncio.run(main())
