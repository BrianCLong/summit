import json

from summit.acp.registry_client import parse_agents


def test_parse_agents_fixture():
    with open("tests/fixtures/acp_registry_min.json") as f:
        doc = json.load(f)
    agents = parse_agents(doc)
    assert len(agents) == 1
    assert agents[0].id == "example"
    assert agents[0].distribution.package == "@example/agent@0.0.1"
