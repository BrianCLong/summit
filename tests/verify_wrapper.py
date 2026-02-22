import os
import shutil
import json
from summit.observability.wrapper import ObservableAgent

class MockAgent:
    name = "mock_agent"
    def decide(self, request):
        return {"decision": "approved", "confidence": 0.9}

def test_wrapper_end_to_end():
    # Cleanup artifacts
    if os.path.exists("artifacts/observability"):
        shutil.rmtree("artifacts/observability")

    agent = MockAgent()
    wrapped = ObservableAgent(agent, agent_id="test-agent")

    inputs = {"q": "test_query"}
    result = wrapped.decide(inputs)

    assert result["decision"] == "approved"

    # Check artifacts
    dirs = os.listdir("artifacts/observability")
    assert len(dirs) == 1
    eid = dirs[0]
    assert eid.startswith("SUMMIT-OBS-")

    path = f"artifacts/observability/{eid}"
    assert os.path.exists(f"{path}/trace.jsonl")
    assert os.path.exists(f"{path}/report.json")
    assert os.path.exists(f"{path}/stamp.json")

    with open(f"{path}/report.json") as f:
        report = json.load(f)
        assert report["step_count"] == 1
        assert report["timeline"][0]["step"] == "decide"

if __name__ == "__main__":
    test_wrapper_end_to_end()
    print("Verification Passed")
