import logging
import random
import time
from typing import List
from .types import Task, Trajectory, Action, ExecutionResult
from ..env.browser import BrowserEnv
from ..env.intelgraph import IntelGraphConnector
from ..tools.gh_cli import GitHubCLI
from ..tools.python_sandbox import PythonSandbox
from .model import FaraModel

log = logging.getLogger("summit-fara")

class ExecutorAgent:
    def __init__(self, endpoint_config: str, use_intelgraph: bool):
        self.endpoint_config = endpoint_config
        self.use_intelgraph = use_intelgraph

        self.browser = BrowserEnv()
        self.gh_cli = GitHubCLI()
        self.python_sandbox = PythonSandbox()
        self.intelgraph = IntelGraphConnector() if use_intelgraph else None

        # Initialize Model (Lazy load or immediate)
        self.model = FaraModel(model_path=endpoint_config if "json" not in endpoint_config else "microsoft/Fara-7B")

        log.info(f"ExecutorAgent initialized with config: {endpoint_config}")

    def run_trajectories(self, task: Task, count: int) -> List[Trajectory]:
        """
        Runs multiple trajectories for a task to gather data for RL.
        """
        trajectories = []
        for i in range(count):
            log.debug(f"  Trajectory {i+1}/{count}")
            result = self.execute(task)
            trajectories.append(result.trajectory)
        return trajectories

    def execute(self, task: Task) -> ExecutionResult:
        """
        Executes a single task using the agent loop (Observation -> Thought -> Action).
        """
        trajectory = Trajectory(task_id=task.id)
        success = False
        output = ""

        # Simulation of the agent loop
        steps = 0
        max_steps = 10 # 10 steps vs Fara's 16

        log.info(f"Starting execution for task: {task.id}")

        while steps < max_steps:
            steps += 1

            # 1. Observation (Screenshot + Graph context)
            screenshot_path = self.browser.capture_screenshot()
            graph_context = {}
            if self.intelgraph:
                # Example: "Query taxonomy leaks before browser PR submit"
                if "taxonomy" in task.description.lower():
                    graph_context = self.intelgraph.query("MATCH (n:Sensitive) RETURN n LIMIT 5")

            # 2. Thought (Model prediction)
            prompt = f"Task: {task.description}\nStep: {steps}\nContext: {graph_context}"
            thought = self.model.predict(prompt, image_path=screenshot_path)
            log.debug(f"Thought: {thought}")

            # 3. Action (Browser, CLI, Graph)
            # Parsing the model output to determine action (simplified heuristic for now if model returns text)
            # In production, we'd use a robust parser or JSON mode.

            action_type = "browser"
            params = {}

            # Heuristic fallback if model returns raw text or mock
            if "gh pr create" in thought or ("PR" in task.description and steps > 5):
                action_type = "cli"
                params = {"command": "gh pr create --fill"}
            elif "graph" in task.description.lower() and self.intelgraph:
                action_type = "graph"
                params = {"query": "MATCH (n) RETURN count(n)"}
            elif "python" in task.description.lower():
                action_type = "python"
                params = {"code": "print('Hello from Sandbox')"}
            else:
                action_type = "browser"
                params = {"x": random.randint(0, 1920), "y": random.randint(0, 1080), "type": "click"}

            action = Action(type=action_type, params=params, timestamp=time.time())
            trajectory.actions.append(action)

            # Execute Action
            self._execute_action(action)

            # Check termination (simulated)
            if steps == max_steps or (action_type == "cli" and "pr create" in params.get("command", "")):
                success = True
                output = "Task completed (simulated)"
                break

        # Calculate reward
        trajectory.reward = self._calculate_reward(task, trajectory, success)
        trajectory.success = success

        return ExecutionResult(success=success, output=output, trajectory=trajectory)

    def _execute_action(self, action: Action):
        """
        Delegates action to appropriate tool.
        """
        if action.type == "browser":
            self.browser.perform(action.params)
        elif action.type == "cli":
            self.gh_cli.run(action.params.get("command"))
        elif action.type == "graph":
            if self.intelgraph:
                self.intelgraph.query(action.params.get("query"))
        elif action.type == "python":
            self.python_sandbox.run(action.params.get("code"))

    def _calculate_reward(self, task: Task, trajectory: Trajectory, success: bool) -> float:
        """
        Reward = Fara's (Uncertainty + Tool) + Summit Boost.
        """
        base_reward = 0.4 if success else 0.0 # Placeholder for p_hat

        summit_boost = 0.0
        # Check specific Summit criteria
        if "YAML" in task.description:
             summit_boost += 0.2 # YAML fidelity
        if len(trajectory.actions) < 12:
             summit_boost += 0.1 # Velocity bonus

        return base_reward + summit_boost

    def update_policy(self, trajectories: List[Trajectory] | Trajectory):
        """
        Updates the policy using GRPO/ADPO (simulated).
        """
        log.info("Updating policy parameters based on trajectory rewards...")
        # In real implementation:
        # loss = compute_loss(trajectories)
        # optimizer.step()
        pass
