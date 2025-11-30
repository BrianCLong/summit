from typing import List, Dict, Any
import time
import random

class Agent:
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        print(f"[{self.name}] Processing task...")
        # Simulation of processing time
        time.sleep(0.1)
        return {"status": "processed", "agent": self.name}

class ApprovalAgent(Agent):
    def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # Simulate approval logic
        risk_score = context.get("risk_score", 0)
        approved = risk_score < 80
        return {
            "status": "approved" if approved else "rejected",
            "agent": self.name,
            "reason": "Risk score acceptable" if approved else "Risk too high"
        }

class MonitorAgent(Agent):
    def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # Simulate monitoring
        return {"status": "monitored", "anomalies": [], "agent": self.name}

class ExecAgent(Agent):
    def process(self, context: Dict[str, Any]) -> Dict[str, Any]:
        # Simulate execution
        return {"status": "executed", "action": "adjust_price", "agent": self.name}

class DecisionCore:
    def __init__(self):
        self.agents = {
            "approval": ApprovalAgent("ApproveBot", "approver"),
            "monitor": MonitorAgent("WatcherBot", "monitor"),
            "exec": ExecAgent("DoerBot", "executor")
        }

    def run_workflow(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulates a LangGraph/AutoGen workflow:
        Monitor -> Approval -> Execution
        """
        results = {}

        # Step 1: Monitor
        monitor_res = self.agents["monitor"].process(input_data)
        results["monitor"] = monitor_res

        # Step 2: Approval
        # Inject risk score for simulation
        input_data["risk_score"] = input_data.get("risk_score", random.randint(0, 100))
        approval_res = self.agents["approval"].process(input_data)
        results["approval"] = approval_res

        # Step 3: Execution (only if approved)
        if approval_res["status"] == "approved":
            exec_res = self.agents["exec"].process(input_data)
            results["execution"] = exec_res
        else:
            results["execution"] = {"status": "skipped", "reason": "Not approved"}

        return results

if __name__ == "__main__":
    core = DecisionCore()
    res = core.run_workflow({"data": "sample_transaction"})
    print(res)
