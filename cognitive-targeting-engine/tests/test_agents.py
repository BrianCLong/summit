import asyncio
import importlib.util
import pathlib
import sys
from unittest.mock import MagicMock

import pytest

# Dynamically import agents module from the hyphenated package directory
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.append(str(ROOT))
AGENTS_PATH = ROOT / "cognitive-targeting-engine" / "agents.py"
spec = importlib.util.spec_from_file_location("agents", AGENTS_PATH)
agents = importlib.util.module_from_spec(spec)
sys.modules["agents"] = agents
spec.loader.exec_module(agents)  # type: ignore
AgentConfig = agents.AgentConfig
CounterPsyopsAgent = agents.CounterPsyopsAgent


@pytest.mark.asyncio
async def test_agent_logs_countermeasure(monkeypatch):
    mock_client = MagicMock()
    monkeypatch.setattr(agents, "IntelGraphNeo4jClient", lambda cfg: mock_client)

    agent = CounterPsyopsAgent(AgentConfig(neo4j={}, threshold=0.1))
    entity = {"id": "e1", "deception_score": 0.9}
    await agent.enqueue(entity)

    task = asyncio.create_task(agent.monitor())
    await asyncio.sleep(0.1)
    task.cancel()

    mock_client.create_or_update_entity.assert_called()
    mock_client.create_relationship.assert_called_with(
        "Entity", "id", "e1", "Decoy", "id", "decoy_e1", "COUNTERMEASURE", {"confidence": 0.9}
    )
