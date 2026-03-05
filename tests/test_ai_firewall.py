import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from summit.agents.ai_firewall.code_context_graph import CodeContextGraph
from summit.agents.ai_firewall.dependency_guard import verify_dependency
from summit.agents.ai_firewall.exploit_path_engine import ExploitPathEngine
from summit.agents.ai_firewall.generation_monitor import (
    detect_sql_injection,
    detect_vulnerabilities,
)
from summit.agents.ai_firewall.mcp_adapter import MCPAdapter
from summit.agents.ai_firewall.model_policy_engine import enforce_model_policy


def test_generation_monitor():
    assert detect_sql_injection(["user_input", "raw_sql_query"]) == True
    assert detect_sql_injection(["safe_input"]) == False
    assert detect_vulnerabilities(["user_input", "raw_sql_query"]) == ["SQL injection risk"]

def test_exploit_path_engine():
    graph = CodeContextGraph()
    graph.add_node("user_input")
    engine = ExploitPathEngine()
    paths = engine.analyze(graph)
    assert len(paths) == 1
    assert paths[0] == ["user_input", "string concatenation", "SQL query"]

def test_dependency_guard():
    assert verify_dependency("safe_pkg", 10) == (True, "approved")
    assert verify_dependency("risky_pkg", 60) == (False, "deny_if_package_risk_score > threshold")

def test_model_policy_engine():
    assert enforce_model_policy("gpt4", "medium") == (True, "approved")
    assert enforce_model_policy("open_llm", "high") == (False, "require extra validation")

def test_mcp_adapter():
    adapter = MCPAdapter()
    assert adapter.intercept("print('hello')") == "print('hello')"

if __name__ == "__main__":
    test_generation_monitor()
    test_exploit_path_engine()
    test_dependency_guard()
    test_model_policy_engine()
    test_mcp_adapter()
    print("All AI Firewall tests passed!")
