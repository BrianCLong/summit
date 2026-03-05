"""
ACP Playbook Execution Module
Integrates the Skill Registry with the Agent Control Plane.
"""
from typing import Any, Dict, List


class AgentContext:
    def __init__(self, tenant: str, domain: str, tmaml_session: Any):
        self.tenant = tenant
        self.domain = domain
        self.tmaml_session = tmaml_session

class SkillInvocation:
    def __init__(self, skill_name: str, args: dict[str, Any]):
        self.skill_name = skill_name
        self.args = args

class OrchestratorPlanner:
    def __init__(self, registry_client: Any, promoter: Any):
        self.registry = registry_client
        self.promoter = promoter

    def build_playbook(self, workload_name: str, context: AgentContext) -> list[SkillInvocation]:
        """
        Chains skills into reusable playbooks for common Summit workloads.
        """
        playbook = []
        if workload_name == "new repo hardening":
            # Determine when to call an existing skill vs. free-form reasoning
            skill_meta = self.registry.query("security-hardening-v1")
            if skill_meta and self.promoter.enforce_governance(skill_meta, context.tenant, context.domain):
                playbook.append(SkillInvocation("security-hardening-v1", {"strict": True}))
            else:
                playbook.append(SkillInvocation("agent-reasoning", {"task": "harden repository"}))
        return playbook

    def execute_playbook(self, playbook: list[SkillInvocation], context: AgentContext):
        """
        Executes chained skills and feeds telemetry back into TMAML.
        """
        results = []
        for inv in playbook:
            print(f"Executing: {inv.skill_name} with {inv.args}")
            # Mock execution
            success = True
            if not success:
                 context.tmaml_session.log_regression(inv.skill_name, context.tenant)
            results.append({"skill": inv.skill_name, "success": success})
            # Log execution outcome feeding back into ASF
            context.tmaml_session.log_execution(inv.skill_name, success)
        return results
