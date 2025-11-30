from mrse.agent_models import CodexModel, JulesModel
from mrse.constraint_engine import ConstraintEngine
from mrse.state_mutation import StateMutationEngine
from mrse.world_state import WorldState


def test_state_mutation_applies_actions_and_respects_constraints():
    # Constraint that rejects worlds with more than one diff for safety.
    def max_one_diff(world: WorldState) -> bool:
        return len(world.diffs) <= 1

    state = WorldState.from_sources({"files": 1}, intents=["intent"], invariants=[max_one_diff])
    engine = StateMutationEngine(
        {"jules": JulesModel(), "codex": CodexModel()},
        ConstraintEngine(),
    )

    worlds = engine.expand(state)

    assert worlds, "expected at least one future world"
    for world in worlds:
        assert len(world.diffs) <= 1
        assert world.agents
