# server/src/ai/nl_to_cypher/cypher_sandbox_executor.py

# Import check_access from governance module
# Ensure project root is in sys.path for this import
import os
import sys

# Add the project root to sys.path if not already present
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from server.src.governance.access_manager import check_access


def execute_cypher_in_sandbox(cypher_query: str, user_context: dict = None) -> dict:
    """
    Executes a Cypher query in a sandboxed environment after an access control check.
    Returns simulated results.
    """
    print(f"Executing Cypher in sandbox: {cypher_query}")

    # Perform access control check
    # Simplified: assuming action is 'execute_query' and resource is 'cypher_sandbox'
    if user_context:
        if not check_access(user_context, "cypher_sandbox", "execute_query"):
            return {
                "success": False,
                "results": [],
                "warnings": [
                    "Access Denied: User does not have permission to execute queries in sandbox."
                ],
            }
    else:
        # If no user_context provided, assume default access or deny
        return {
            "success": False,
            "results": [],
            "warnings": ["Access Denied: No user context provided for sandbox execution."],
        }

    # Simulate execution results
    if "MATCH (p:Person)" in cypher_query:
        return {"success": True, "results": [{"name": "Alice"}, {"name": "Bob"}], "warnings": []}
    else:
        return {
            "success": True,
            "results": [],
            "warnings": ["No matching data found or query not supported in sandbox."],
        }


def rollback_sandbox_changes(transaction_id: str) -> bool:
    """
    Stub for rolling back changes made in a sandbox execution.
    """
    print(f"Rolling back sandbox changes for transaction: {transaction_id}")
    return True
