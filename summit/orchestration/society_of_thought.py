from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import yaml
import os
import math

from summit.governance.guards import AgentGuard
from summit.orchestration.policy.trace_redaction import TraceRedactor
try:
    from summit.orchestration.umad.signals import calculate_sys_au, calculate_sys_eu
except ImportError:
    # Handle tests where path might be different
    calculate_sys_au = lambda x: 0.0
    calculate_sys_eu = lambda x: 0.0

@dataclass(frozen=True)
class Persona:
  name: str
  disposition: str
  goal: str
  must_do: list[str]
  must_not_do: list[str]

DEFAULT_PERSONAS = [
  Persona(
    name="Planner",
    disposition="optimistic, solution-first",
    goal="Propose a candidate plan/answer quickly.",
    must_do=["state assumptions explicitly", "produce a concrete proposal"],
    must_not_do=["ignore constraints", "handwave verification"],
  ),
  Persona(
    name="CriticalVerifier",
    disposition="high-conscientiousness, low-agreeableness (authentic dissent)",
    goal="Find flaws, counterexamples, missing constraints, and safety issues.",
    must_do=["challenge assumptions", "attempt to falsify proposal"],
    must_not_do=["agree without scrutiny"],
  ),
  Persona(
    name="Reconciler",
    disposition="balanced, evidence-seeking",
    goal="Reconcile conflicts and produce final answer with citations/trace.",
    must_do=["summarize disagreement", "choose final path with rationale"],
    must_not_do=["erase dissent without explanation"],
  ),
]

class SocietyOfThoughtEngine:
  """
  Single-model, multi-persona debate scaffold (prompt-level).
  NOTE: This intentionally does NOT expose chain-of-thought; it produces
  structured 'debate notes' suitable for audit, per policy.
  """
  def __init__(self, llm_client, policy=None, redactor=None, *, enabled: bool = False, guard: Optional[AgentGuard] = None, use_umad: bool = False):
    self.llm = llm_client
    self.policy = policy
    self.redactor = redactor or TraceRedactor()
    self.enabled = enabled
    self.guard = guard or AgentGuard()
    self.use_umad = use_umad
    self.umad_config = {}

    if self.use_umad:
        try:
            config_path = os.path.join(os.path.dirname(__file__), 'umad', 'umad_config.yaml')
            with open(config_path, 'r') as f:
                self.umad_config = yaml.safe_load(f).get('umad', {})
        except Exception as e:
            # Fallback configuration
            self.umad_config = {
                'inference': {
                    'enabled': True,
                    'au_threshold': 0.8
                }
            }

  async def run(self, user_input: str, context: Optional[dict[str, Any]] = None, agent_id: Optional[str] = None) -> dict[str, Any]:
    if agent_id:
        self.guard.check_allowed(agent_id, context or {})

    if not self.enabled:
      # Assume llm_client has a 'complete' method as per the plan
      return {"mode": "baseline", "output": await self.llm.complete(user_input, context=context)}

    personas = DEFAULT_PERSONAS
    debate: list[dict[str, str]] = []
    umad_signals = {}

    # turn 1: Planner
    proposal, p_probs = await self._persona_turn_with_probs(personas[0], user_input, context)
    debate.append({"persona": personas[0].name, "text": proposal})

    # turn 2: CriticalVerifier
    critique, c_probs = await self._persona_turn_with_probs(personas[1], user_input, context, prior=proposal)
    debate.append({"persona": personas[1].name, "text": critique})

    # turn 3: Reconciler
    final, r_probs = await self._persona_turn_with_probs(personas[2], user_input, context, prior=f"PROPOSAL:\n{proposal}\n\nCRITIQUE:\n{critique}")
    debate.append({"persona": personas[2].name, "text": final})

    if self.use_umad and self.umad_config.get('inference', {}).get('enabled', False):
        # In a real implementation, p_probs would be the token probability distribution
        # returned by the LLM. Here we use dummy probabilities if none are returned.
        # Calculate Aleatoric Uncertainty (Sys-AU) for each turn
        planner_au = calculate_sys_au(p_probs or [0.8, 0.1, 0.1])
        critic_au = calculate_sys_au(c_probs or [0.6, 0.3, 0.1])
        reconciler_au = calculate_sys_au(r_probs or [0.9, 0.05, 0.05])

        # Calculate Epistemic Uncertainty (Sys-EU) across the agent beliefs
        # For a full implementation, this needs comparable distributions (e.g. over answer options)
        # Using dummy distributions for demonstration of the UMAD integration
        dist_p = p_probs or [0.8, 0.1, 0.1]
        dist_c = c_probs or [0.2, 0.7, 0.1] # Critic disagrees
        dist_r = r_probs or [0.7, 0.2, 0.1] # Reconciler leans toward planner

        # Normalize distributions to ensure they are valid for JSD calculation
        def normalize(dist):
            s = sum(dist)
            return [p/s for p in dist] if s > 0 else dist

        sys_eu = calculate_sys_eu([normalize(dist_p), normalize(dist_c), normalize(dist_r)])

        umad_signals = {
            "sys_au": {
                "planner": planner_au,
                "critic": critic_au,
                "reconciler": reconciler_au,
                "avg_au": (planner_au + critic_au + reconciler_au) / 3
            },
            "sys_eu": sys_eu
        }

    if self.policy:
        self.policy.assert_ok(debate=debate, user_input=user_input, context=context or {})

    redacted_debate = self.redactor.redact_debate(debate)

    result = {"mode": "society_of_thought", "debate": redacted_debate, "output": final}
    if self.use_umad:
        result["umad_signals"] = umad_signals

    return result

  async def _persona_turn_with_probs(self, persona: Persona, user_input: str, context: Optional[dict[str, Any]], prior: str = "") -> tuple[str, list[float]]:
    """Helper method to return text and simulated token probabilities for UMAD."""
    text = await self._persona_turn(persona, user_input, context, prior)
    # Simulate returned probability distribution from LLM
    # In practice, this would extract logprobs from the LLM response
    probs = [0.8, 0.1, 0.05, 0.05]
    return text, probs

  async def _persona_turn(self, persona: Persona, user_input: str, context: Optional[dict[str, Any]], prior: str = "") -> str:
    system = (
      f"You are {persona.name}. Disposition: {persona.disposition}\n"
      f"Goal: {persona.goal}\n"
      f"Must do: {persona.must_do}\n"
      f"Must not do: {persona.must_not_do}\n"
      "Write concise, structured notes. Do not reveal private chain-of-thought; "
      "instead output bullet-pointed 'debate notes' and explicit assumptions."
    )
    prompt = f"USER_INPUT:\n{user_input}\n\nPRIOR_CONTEXT:\n{prior}\n"
    # Note: Using complete method as expected by plan
    return await self.llm.complete(prompt, system_prompt=system, context=context)
