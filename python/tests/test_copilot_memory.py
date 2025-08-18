from intelgraph_py.copilot.memory import CopilotMemory


def test_memory_chain_structure():
    memory = CopilotMemory()
    memory.add_user_action("s1", "u1", "searched database")
    memory.add_ai_insight("s1", "u1", "consider node 42")
    memory.add_analyst_response("s1", "u1", "investigating node 42")

    chains = memory.get_memory_chain("s1", "u1")
    assert len(chains) == 1
    chain = chains[0]
    assert chain.user_action.content == "searched database"
    assert chain.ai_insight.content == "consider node 42"
    assert chain.analyst_response.content == "investigating node 42"


def test_memory_scope_per_session():
    memory = CopilotMemory()
    memory.add_user_action("s1", "u1", "search A")
    memory.add_user_action("s2", "u1", "search B")

    chains_s1 = memory.get_memory_chain("s1", "u1")
    chains_s2 = memory.get_memory_chain("s2", "u1")
    assert len(chains_s1) == 1
    assert chains_s1[0].user_action.content == "search A"
    assert len(chains_s2) == 1
    assert chains_s2[0].user_action.content == "search B"


def test_export_memory():
    memory = CopilotMemory()
    memory.add_user_action("s1", "u1", "action")
    exported = memory.export_memory("s1", "u1")
    assert exported[0]["user_action"]["content"] == "action"
    assert "timestamp" in exported[0]["user_action"]
