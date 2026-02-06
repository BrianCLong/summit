import math
import random
import json

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
    def __init__(self, cost_model, iterations=10, seed=42):
        self.cost_model = cost_model
        self.iterations = iterations
        self.seed = seed
        random.seed(seed)

    def plan(self, root_state, budget_ledger):
        root = MCTSNode(root_state, "root")

        for _ in range(self.iterations):
            node = self._select(root)
            reward = self._simulate(node, budget_ledger)
            self._backpropagate(node, reward)

        return self._generate_plan(root)

    def _select(self, node):
        while node.children:
            node = max(node.children, key=lambda c: c.uct_score(node.visits))
        return node

    def _simulate(self, node, budget_ledger):
        task_type = random.choice(["design", "decompose", "implement", "evaluate"])
        cost = self.cost_model.get_cost(task_type)
        try:
            budget_ledger.record(f"task_{node.visits}", task_type, cost)
            return random.random() # Simplified reward
        except ValueError:
            return 0.0

    def _backpropagate(self, node, reward):
        while node:
            node.visits += 1
            node.value += reward
            node = node.parent

    def _generate_plan(self, root):
        # In a real implementation, this would extract the best path
        return {"steps": [{"id": "initial_research", "type": "design", "cost": 10}]}
