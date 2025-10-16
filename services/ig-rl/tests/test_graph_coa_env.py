import numpy as np
import pytest
from ig_rl.envs.graph_coa_env import GraphCoaEnv
from ig_rl.reward.hub import RewardHub


class StubSimulator:
    async def start_session(self, case_id):
        return {
            "sessionId": "sess-1",
            "initialState": {"features": [0.1, 0.2, 0.3]},
            "candidateSteps": ["a", "b"],
        }

    async def apply(self, session_id, action):
        return {
            "state": {"features": [0.5, 0.4, 0.3]},
            "candidateSteps": ["b"],
            "metrics": {"time_to_insight": 0.7, "accuracy": 0.9, "cost": 0.1},
            "terminal": True,
        }


class StubPolicy:
    async def allowed_actions(self, case_id, candidates):
        return list(candidates)


@pytest.mark.asyncio
async def test_graph_coa_env_masks_actions():
    reward_hub = RewardHub({"time_to_insight": 0.5, "accuracy": 0.3, "cost": 0.2})
    env = GraphCoaEnv(
        simulator_client=StubSimulator(),
        policy_client=StubPolicy(),
        reward_hub=reward_hub,
    )

    obs, info = await env.reset(options={"case_id": "case-123"})
    assert isinstance(obs, np.ndarray)
    assert info["mask"].sum() == 2

    obs, reward, done, step_info = await env.step(0)
    assert done is True
    assert reward != 0
    assert "reward_components" in step_info
