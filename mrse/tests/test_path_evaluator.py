from mrse.agent_models import default_agent_models
from mrse.constraint_engine import ConstraintEngine
from mrse.horizon_manager import HorizonManager
from mrse.path_evaluator import PathEvaluator
from mrse.state_mutation import StateMutationEngine
from mrse.world_state import WorldState


def test_best_path_returns_highest_scoring_trajectory():
    state = WorldState.from_sources({"files": 1}, intents=["intent-a"], tasks=["t1"], safety={"risk": 0.0})
    engine = StateMutationEngine(default_agent_models(), ConstraintEngine())
    manager = HorizonManager(engine)
    graph = manager.generate_trees(state, depth=2)

    path = PathEvaluator().best_path(graph, root_id=state.id)

    assert path is not None
    assert path[-1].score >= 0
