import random
import json
import math
from typing import List, Dict, Any, Optional
from summit.mars.cost import CostModel, TaskType

class MCTSNode:
    def __init__(self, task_type: TaskType, cost: float, parent=None):
        self.task_type = task_type
        self.cost = cost
        self.parent = parent
        self.children: Dict[str, MCTSNode] = {}
        self.visits = 0
        self.value = 0.0

    def add_child(self, name: str, node: 'MCTSNode'):
        self.children[name] = node

    def is_fully_expanded(self, possible_tasks: List[TaskType]):
        return len(self.children) == len(possible_tasks)

class MCTSPlanner:
    def __init__(self, evidence_id: str, budget_limit: float, seed: int = 42):
        self.evidence_id = evidence_id
        self.budget_limit = budget_limit
        self.cost_model = CostModel.default()
        self.rng = random.Random(seed)
        self.root = MCTSNode(TaskType.DESIGN, 0.0) # Dummy root or first step

    def plan(self, iterations: int = 100) -> Dict[str, Any]:
        # simplified MCTS for demonstration of budget awareness and determinism
        possible_tasks = [TaskType.DESIGN, TaskType.DECOMPOSE, TaskType.IMPLEMENT, TaskType.EVALUATE, TaskType.REFLECTION]

        # Sort possible tasks by name to ensure stable iteration order
        sorted_tasks = sorted(possible_tasks, key=lambda x: x.value)

        for _ in range(iterations):
            node = self._select(self.root)
            if node.cost < self.budget_limit:
                # Expansion
                untried = [t for t in sorted_tasks if t.value not in node.children]
                if untried:
                    task_type = untried[0] # Stable selection
                    cost = self.cost_model.get_cost(task_type)
                    if node.cost + cost <= self.budget_limit:
                        child = MCTSNode(task_type, node.cost + cost, parent=node)
                        node.add_child(task_type.value, child)
                        # Backpropagate (simplified)
                        self._backpropagate(child, 1.0)

        # Extract best path
        path = self._extract_best_path()

        return {
            "schema_version": "1.0",
            "evidence_id": self.evidence_id,
            "tasks": path
        }

    def _select(self, node: MCTSNode) -> MCTSNode:
        while node.children:
            # UCB1 or stable selection
            # For determinism in selection, we sort children keys
            sorted_keys = sorted(node.children.keys())
            node = node.children[sorted_keys[0]]
        return node

    def _backpropagate(self, node: MCTSNode, value: float):
        while node:
            node.visits += 1
            node.value += value
            node = node.parent

    def _extract_best_path(self) -> List[Dict[str, Any]]:
        path = []
        curr = self.root
        step = 0
        while curr.children:
            # Pick child with most visits
            sorted_children = sorted(curr.children.items(), key=lambda x: (-x[1].visits, x[0]))
            task_name, next_node = sorted_children[0]

            path.append({
                "task_id": f"task_{step}",
                "type": task_name,
                "dependencies": [f"task_{step-1}"] if step > 0 else []
            })
            curr = next_node
            step += 1
        return path
