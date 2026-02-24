from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from summit.governance.guards import AgentGuard
from summit.orchestration.policy.trace_redaction import TraceRedactor


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
  def __init__(self, llm_client, policy=None, redactor=None, *, enabled: bool = False, guard: Optional[AgentGuard] = None):
    self.llm = llm_client
    self.policy = policy
    self.redactor = redactor or TraceRedactor()
    self.enabled = enabled
    self.guard = guard or AgentGuard()

  async def run(self, user_input: str, context: Optional[dict[str, Any]] = None, agent_id: Optional[str] = None) -> dict[str, Any]:
    if agent_id:
        self.guard.check_allowed(agent_id, context or {})

    if not self.enabled:
      # Assume llm_client has a 'complete' method as per the plan
      return {"mode": "baseline", "output": await self.llm.complete(user_input, context=context)}

    personas = DEFAULT_PERSONAS
    debate: list[dict[str, str]] = []

    # turn 1: Planner
    proposal = await self._persona_turn(personas[0], user_input, context)
    debate.append({"persona": personas[0].name, "text": proposal})

    # turn 2: CriticalVerifier
    critique = await self._persona_turn(personas[1], user_input, context, prior=proposal)
    debate.append({"persona": personas[1].name, "text": critique})

    # turn 3: Reconciler
    final = await self._persona_turn(personas[2], user_input, context, prior=f"PROPOSAL:\n{proposal}\n\nCRITIQUE:\n{critique}")
    debate.append({"persona": personas[2].name, "text": final})

    if self.policy:
        self.policy.assert_ok(debate=debate, user_input=user_input, context=context or {})

    redacted_debate = self.redactor.redact_debate(debate)

    return {"mode": "society_of_thought", "debate": redacted_debate, "output": final}

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
