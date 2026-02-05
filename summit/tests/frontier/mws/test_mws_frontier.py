import pytest
from typing import Dict, Any, Optional

from summit.frontier.context.mock_crm import MockCRMProvider
from summit.frontier.context.mock_ticketing import MockTicketingProvider
from summit.frontier.exec.tools import Tool, ToolRouter, ToolContext
from summit.frontier.exec.runtime import AgentRuntime
from summit.frontier.iam.identity import AgentIdentity
from summit.frontier.iam.policy import DenyByDefaultPolicy
from summit.frontier.memory.store import MemoryStore
from summit.frontier.evidence import evidence_id

# --- MWS Scenario Setup ---

def lookup_customer_tool(ticket_id: str) -> str:
    crm = MockCRMProvider()
    ticketing = MockTicketingProvider()

    # In a real tool, we might handle errors more gracefully or return structured data
    ticket = ticketing.get_entity(ticket_id)
    if not ticket:
        return "Ticket not found"

    cust_id = ticket.related_ids[0]
    customer = crm.get_entity(cust_id)
    if not customer:
        return "Customer not found"

    return f"Customer: {customer.attributes['name']} (ID: {cust_id})"

def add_memory_tool(content: Dict[str, Any], memory_store: MemoryStore) -> str:
    entry_id = memory_store.add(content)
    return f"Memory stored: {entry_id}"

class MWSWorkflow:
    def __init__(self):
        # 1. Setup IAM
        self.identity = AgentIdentity(
            id="agent-mws",
            allowed_tools=["lookup_customer", "store_memory"]
        )
        self.policy = DenyByDefaultPolicy(self.identity)

        # 2. Setup Memory
        self.memory = MemoryStore()

        # 3. Setup Runtime
        self.router = ToolRouter(policy_gate=self.policy)

        # Register Tools
        self.router.register(Tool("lookup_customer", lookup_customer_tool, "Find customer by ticket"))

        # Curried tool for memory to inject store
        # Note: Tool.execute does func(**args).
        # So we need a wrapper that accepts 'content' and passes it + store.
        def memory_wrapper(content: Dict[str, Any]):
            return add_memory_tool(content, self.memory)

        self.router.register(Tool("store_memory", memory_wrapper, "Save to memory"))

        self.runtime = AgentRuntime(self.router)
        self.context = ToolContext(user_id="user_test", session_id="sess_001")

def test_mws_end_to_end():
    workflow = MWSWorkflow()

    # Step 1: Lookup Customer (Allowed)
    result1 = workflow.runtime.run_step(
        "lookup_customer",
        {"ticket_id": "tkt_100"},
        workflow.context
    )
    assert "Acme Corp" in result1

    # Step 2: Store Memory with PII (Allowed + Redacted)
    content = {"note": "Customer Acme contact is alice@example.com"}
    result2 = workflow.runtime.run_step(
        "store_memory",
        {"content": content},
        workflow.context
    )
    assert "Memory stored" in result2

    # Step 3: Verify Memory Redaction
    mem_id = result2.split(": ")[1]
    stored = workflow.memory.get(mem_id)
    assert stored["content"]["note"] == "Customer Acme contact is <EMAIL>"

    # Step 4: Verify Policy Denial (Unregistered/Disallowed tool)
    # Registering a restricted tool dynamically to test policy
    restricted_tool = Tool("delete_db", lambda x: "deleted", "Dangerous")
    workflow.router.register(restricted_tool)

    with pytest.raises(PermissionError):
        workflow.runtime.run_step(
            "delete_db",
            {"x": 1},
            workflow.context
        )

    # Step 5: Verify Evidence ID Generation (Scaffolding check)
    eid = evidence_id("MWS_RUN", 1)
    assert eid.startswith("SUMMIT-FRONTIER:MWS_RUN:")

def test_performance_budget():
    # Simple check that the workflow runs fast enough (Mock budget)
    import time
    start = time.time()
    test_mws_end_to_end()
    duration = time.time() - start
    assert duration < 2.0  # Budget from prompt
