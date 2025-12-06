import logging
import time
from .curriculum import CurriculumAgent
from .executor import ExecutorAgent

log = logging.getLogger("summit-fara")

class CoEvolutionLoop:
    def __init__(self, endpoint_config: str, max_rounds: int, use_intelgraph: bool):
        self.max_rounds = max_rounds
        self.use_intelgraph = use_intelgraph

        log.info("Initializing Agents...")
        self.curriculum_agent = CurriculumAgent()
        self.executor_agent = ExecutorAgent(endpoint_config, use_intelgraph)

        # Base policy π_base is implied to be loaded within ExecutorAgent using endpoint_config

    def run_evolution(self):
        """
        Runs the Co-Evolution Loop:
        1. Curriculum Agent generates tasks from repo state.
        2. Executor Agent attempts tasks.
        3. Rewards calculated (Fara's + Summit Boost).
        4. Policies updated (GRPO/ADPO).
        """
        for round_id in range(1, self.max_rounds + 1):
            log.info(f"--- Evolution Round {round_id}/{self.max_rounds} ---")

            # 1. Curriculum Evolution
            log.info("Step 1: Curriculum Generation (πθ)")
            tasks = self.curriculum_agent.generate_tasks(count=10) # Reduced from 100 for dev
            log.info(f"Generated {len(tasks)} tasks (e.g., '{tasks[0].description if tasks else 'None'}')")

            # 2. Executor Evolution
            log.info("Step 2: Executor Rollouts (πϕ)")
            for task in tasks:
                log.info(f"Executing task: {task.description}")

                # Run visual trajectories (simulated count)
                trajectories = self.executor_agent.run_trajectories(task, count=3) # Reduced from 10

                # Calculate Reward
                # Reward = Fara's (Uncertainty + Tool) + Summit Boost (YAML, PR velocity, Leak-free)
                avg_reward = sum(t.reward for t in trajectories) / len(trajectories)
                log.info(f"Task Reward: {avg_reward:.2f}")

                # Update Policy (GRPO/ADPO)
                self.executor_agent.update_policy(trajectories)

            log.info(f"Round {round_id} complete. Policy updated.")

    def execute_task(self, task_description: str):
        """
        Executes a single specific task without the full evolution loop.
        """
        log.info(f"Executing single task: {task_description}")
        from .types import Task
        task = Task(id="manual-1", description=task_description, type="manual")
        result = self.executor_agent.execute(task)
        if result.success:
            log.info("Task completed successfully.")
        else:
            log.error("Task failed.")
