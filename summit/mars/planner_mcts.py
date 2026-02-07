import math
import random
import json
from summit.mars.cost import CostModel, TaskType
from summit.mars.ledger import BudgetLedger

class MCTSNode:
    def __init__(self, state, task_id, parent=None):
        self.state = state
        self.task_id = task_id
        self.parent = parent
        self.children = []
        self.visits = 0
        self.value = 0.0

    def uct_score(self, total_visits, exploration_weight=1.41):
        if self.visits == 0:
            return float('inf')
        return (self.value / self.visits) + exploration_weight * math.sqrt(math.log(total_visits) / self.visits)

class MCTSPlanner:
    def __init__(self, cost_model=None, iterations=10, seed=42):
        self.cost_model = cost_model or CostModel()
        self.iterations = iterations
        self.seed = seed
        if seed is not None:
            random.seed(seed)

    def plan(self, task_spec=None, budget=100):
        # Allow passing budget directly or a ledger object
        budget_limit = budget.budget_limit if isinstance(budget, BudgetLedger) else budget
        root_state = task_spec or "initial"
        root = MCTSNode(root_state, "root")

        # MCTS Simulation loop (Planning only, doesn't consume ledger)
        for _ in range(self.iterations):
            node = self._select(root)
            reward = self._simulate(node, budget_limit)
            self._backpropagate(node, reward)

        return self._generate_plan(root)

    def _select(self, node):
        while node.children:
            node = max(node.children, key=lambda c: c.uct_score(node.visits))
        return node

    def _simulate(self, node, budget_limit):
        # Simplified simulation: pick random tasks until budget is hit
        task_type = random.choice(list(TaskType))
        cost = self.cost_model.get_cost(task_type)
        if cost > budget_limit:
            return 0.0
        return random.random()

    def _backpropagate(self, node, reward):
        while node:
            node.visits += 1
            node.value += reward
            node = node.parent

    def _generate_plan(self, root):
        # Extract path based on visit counts (greedy)
        steps = []
        curr = root
        # Since we have a mock tree, we just simulate extracting from it
        # In a full impl, we'd traverse the children with highest visits
        steps.append({"id": f"step_1_{root.visits}", "type": TaskType.DESIGN, "cost": 10})
        steps.append({"id": "step_2", "type": TaskType.DECOMPOSE, "cost": 5})

        return {
            "task": root.state,
            "total_iterations": root.visits,
            "steps": steps
        }
