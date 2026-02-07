from __future__ import annotations

from dataclasses import dataclass

from summit.discover.runner import Candidate, ProposalGenerator


@dataclass(frozen=True)
class ToyContinuousEvaluator:
    target: float = 0.37

    def evaluate(self, proposal: float) -> float:
        return -abs(proposal - self.target)


@dataclass(frozen=True)
class ToyContinuousProposalGenerator(ProposalGenerator):
    target: float = 0.37

    def candidates(self, step: int, best_proposal: float | None) -> list[Candidate]:
        proposal = _scheduled_proposal(step, self.target)
        return [Candidate(proposal=proposal, prior=_prior_from_target(proposal, self.target))]


def _scheduled_proposal(step: int, target: float) -> float:
    schedule = [0.0, 0.5, 0.4, 0.35, 0.37, 0.372, 0.369]
    if step < len(schedule):
        return schedule[step]
    return schedule[-1]


def _prior_from_target(proposal: float, target: float) -> float:
    distance = abs(proposal - target)
    return 1.0 / (1.0 + distance)
