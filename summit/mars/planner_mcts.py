import math
import random
import json
from summit.mars.cost import CostModel, TaskType

class MCTSNode:
    def __init__(self, state, task_type=None, parent=None, cost=0):
        self.state = state
        self.task_type = task_type
        self.parent = parent
        self.children = []
        self.visits = 0
        self.value = 0.0
        self.cost = cost
        self.cumulative_cost = (parent.cumulative_cost if parent else 0) + cost

    def uct_score(self, total_visits, exploration_weight=1.41):
        if self.visits == 0:
            return float('inf')
        return (self.value / self.visits) + exploration_weight * math.sqrt(math.log(total_visits) / self.visits)

class MCTSPlanner:
    def __init__(self, cost_model=None, iterations=100, seed=42):
        self.cost_model = cost_model or CostModel()
        self.iterations = iterations
        self.seed = seed
        self.rng = random.Random(seed)

    def plan(self, task_spec, budget):
        budget_limit = budget.budget_limit if hasattr(budget, 'budget_limit') else budget
        root = MCTSNode(task_spec, TaskType.DESIGN, cost=self.cost_model.get_cost(TaskType.DESIGN))

        for _ in range(self.iterations):
            node = self._select(root, budget_limit)
            if node.cumulative_cost < budget_limit:
                child = self._expand(node, budget_limit)
                reward = self._simulate(child, budget_limit)
                self._backpropagate(child, reward)
            else:
                self._backpropagate(node, 0.0)

        return self._generate_plan(root)

    def _select(self, node, budget_limit):
        while node.children:
            # Only consider children within budget
            valid_children = [c for c in node.children if c.cumulative_cost <= budget_limit]
            if not valid_children:
                break
            node = max(valid_children, key=lambda c: c.uct_score(node.visits))
        return node

    def _expand(self, node, budget_limit):
        # Possible next tasks
        possible_tasks = [TaskType.DECOMPOSE, TaskType.IMPLEMENT, TaskType.EVALUATE]
        for ttype in possible_tasks:
            cost = self.cost_model.get_cost(ttype)
            if node.cumulative_cost + cost <= budget_limit:
                # Check if already expanded
                if not any(c.task_type == ttype for c in node.children):
                    new_node = MCTSNode(f"{node.state}->{ttype}", ttype, parent=node, cost=cost)
                    node.children.append(new_node)
                    return new_node
        return node

    def _simulate(self, node, budget_limit):
        # Simplified simulation
        remaining_budget = budget_limit - node.cumulative_cost
        if remaining_budget < 0:
            return 0.0
        # Deterministic reward based on seed and node path
        return self.rng.random()

    def _backpropagate(self, node, reward):
        while node:
            node.visits += 1
            node.value += reward
            node = node.parent

    def _generate_plan(self, root):
        steps = []
        curr = root
        while curr:
            steps.append({
                "id": f"step_{len(steps)+1}",
                "type": curr.task_type,
                "cost": curr.cost,
                "cumulative_cost": curr.cumulative_cost
            })
            if not curr.children:
                break
            # Pick best child
            curr = max(curr.children, key=lambda c: c.visits)
            if curr.visits == 0:
                break

        return {
            "task": root.state,
            "total_iterations": self.iterations,
            "seed": self.seed,
            "steps": steps
        }
