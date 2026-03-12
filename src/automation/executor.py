import json
import os
from datetime import datetime
from typing import Dict, Any, Callable, Optional, Tuple

from pydantic import BaseModel

from src.automation.safe_policies import AutomationActionClass, SubjectType
from src.automation.router import (
    AutomationRouter,
    PlaybookStep,
    RiskContext,
    GovernanceContext,
    RoutingDecision,
    route_step
)

# ---------------------------------------------------------------------------
# Execution Log
# ---------------------------------------------------------------------------

class ExecutionLogEntry(BaseModel):
    execution_id: str
    timestamp: str
    action_class: str
    subject_type: str
    subject_id: str
    risk_context: Dict[str, Any]
    governance_context: Dict[str, Any]
    initiator: str
    result: str  # "SUCCESS", "FAILURE", "MANUAL_REQUIRED", "APPROVAL_REQUIRED"
    error_message: Optional[str] = None

class AutomationExecutionLog:
    def __init__(self, log_file: str = "logs/automation_executions.jsonl"):
        self.log_file = log_file
        os.makedirs(os.path.dirname(os.path.abspath(self.log_file)), exist_ok=True)

    def append(self, entry: ExecutionLogEntry):
        with open(self.log_file, 'a') as f:
            f.write(entry.model_dump_json() + "\n")

    def query(self, limit: int = 50) -> list[ExecutionLogEntry]:
        if not os.path.exists(self.log_file):
            return []

        entries = []
        with open(self.log_file, 'r') as f:
            lines = f.readlines()
            # Return newest first
            for line in reversed(lines[-limit:]):
                if line.strip():
                    entries.append(ExecutionLogEntry.model_validate_json(line))
        return entries


# ---------------------------------------------------------------------------
# Internal Executors (Safe, whitelisted actions only)
# ---------------------------------------------------------------------------

def _exec_add_to_watchlist(step: PlaybookStep, subject_id: str) -> Tuple[bool, Optional[str]]:
    # In a real implementation, this would call the internal DB/API
    # print(f"[EXECUTOR] Adding {subject_id} to internal watchlist")
    return True, None

def _exec_raise_internal_case(step: PlaybookStep, subject_id: str) -> Tuple[bool, Optional[str]]:
    # print(f"[EXECUTOR] Opening internal investigation record for {subject_id}")
    return True, None

def _exec_tune_detection_threshold(step: PlaybookStep, subject_id: str) -> Tuple[bool, Optional[str]]:
    # print(f"[EXECUTOR] Adjusting internal, non-destructive detection threshold for {subject_id}")
    return True, None

def _exec_tag_persona_high_risk(step: PlaybookStep, subject_id: str) -> Tuple[bool, Optional[str]]:
    # print(f"[EXECUTOR] Tagging persona {subject_id} as high risk")
    return True, None


_EXECUTOR_REGISTRY: Dict[AutomationActionClass, Callable] = {
    AutomationActionClass.ADD_TO_WATCHLIST: _exec_add_to_watchlist,
    AutomationActionClass.RAISE_INTERNAL_CASE: _exec_raise_internal_case,
    AutomationActionClass.TUNE_DETECTION_THRESHOLD: _exec_tune_detection_threshold,
    AutomationActionClass.TAG_PERSONA_HIGH_RISK: _exec_tag_persona_high_risk,
}

# ---------------------------------------------------------------------------
# Main Executor Engine
# ---------------------------------------------------------------------------

class ExecutionResult(BaseModel):
    executed: bool
    status: str
    message: str

class SAFEExecutor:
    def __init__(self, router: Optional[AutomationRouter] = None, log: Optional[AutomationExecutionLog] = None):
        self.router = router or AutomationRouter()
        self.log = log or AutomationExecutionLog()

    def execute_if_allowed(
        self,
        step: PlaybookStep,
        subject_type: SubjectType,
        subject_id: str,
        risk_ctx: RiskContext,
        governance_ctx: GovernanceContext,
        initiator: str = "system"
    ) -> ExecutionResult:

        # 1. Ask the Router
        route_result = self.router.route_step(step, risk_ctx, governance_ctx)

        # 2. Prepare Log Entry base
        import uuid
        log_entry = ExecutionLogEntry(
            execution_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow().isoformat() + "Z",
            action_class=step.action_class.value,
            subject_type=subject_type.value,
            subject_id=subject_id,
            risk_context={"level": risk_ctx.level.value, "factors": risk_ctx.factors},
            governance_context={"tier": governance_ctx.tier.value, "approvals": governance_ctx.approvals},
            initiator=initiator,
            result="",
            error_message=None
        )

        # 3. Handle non-executable states
        if route_result.decision == RoutingDecision.MANUAL_ONLY:
            log_entry.result = "MANUAL_REQUIRED"
            log_entry.error_message = route_result.reason
            self.log.append(log_entry)
            return ExecutionResult(executed=False, status="MANUAL_ONLY", message=route_result.reason)

        if route_result.decision == RoutingDecision.NEEDS_APPROVAL:
            log_entry.result = "APPROVAL_REQUIRED"
            log_entry.error_message = route_result.reason
            self.log.append(log_entry)
            return ExecutionResult(executed=False, status="NEEDS_APPROVAL", message=route_result.reason)

        # 4. Handle Execution
        if route_result.decision == RoutingDecision.AUTO_EXECUTE_OK:
            executor_fn = _EXECUTOR_REGISTRY.get(step.action_class)

            if not executor_fn:
                # Should not happen if policies match registry, but safe fallback
                log_entry.result = "FAILURE"
                log_entry.error_message = f"No executor implementation found for {step.action_class.value}"
                self.log.append(log_entry)
                return ExecutionResult(executed=False, status="FAILURE", message=log_entry.error_message)

            try:
                success, err = executor_fn(step, subject_id)
                if success:
                    log_entry.result = "SUCCESS"
                    self.log.append(log_entry)
                    return ExecutionResult(executed=True, status="SUCCESS", message=f"Successfully executed {step.action_class.value}")
                else:
                    log_entry.result = "FAILURE"
                    log_entry.error_message = err or "Unknown execution error"
                    self.log.append(log_entry)
                    return ExecutionResult(executed=False, status="FAILURE", message=log_entry.error_message)
            except Exception as e:
                log_entry.result = "FAILURE"
                log_entry.error_message = f"Exception during execution: {str(e)}"
                self.log.append(log_entry)
                return ExecutionResult(executed=False, status="FAILURE", message=log_entry.error_message)

        return ExecutionResult(executed=False, status="UNKNOWN", message="Unknown routing decision")

_default_executor = None

def execute_if_allowed(
    step: PlaybookStep,
    subject_type: SubjectType,
    subject_id: str,
    risk_ctx: RiskContext,
    governance_ctx: GovernanceContext,
    initiator: str = "system"
) -> ExecutionResult:
    global _default_executor
    if _default_executor is None:
        _default_executor = SAFEExecutor()
    return _default_executor.execute_if_allowed(step, subject_type, subject_id, risk_ctx, governance_ctx, initiator)
