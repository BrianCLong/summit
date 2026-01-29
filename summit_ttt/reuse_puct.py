import math
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Node:
    attempt_id: str
    prior_score: float
    visit_count: int = 0
    value_sum: float = 0.0

    @property
    def q_value(self) -> float:
        if self.visit_count == 0:
            return 0.0
        return self.value_sum / self.visit_count

class PUCTBuffer:
    def __init__(self, c_puct: float = 1.0):
        self.c_puct = c_puct
        self.nodes: List[Node] = []
        self.total_visits = 0

    def add(self, attempt_id: str, prior_score: float):
        self.nodes.append(Node(attempt_id, prior_score))

    def select(self) -> Optional[str]:
        if not self.nodes:
            return None

        best_node = None
        best_score = -float('inf')

        for node in self.nodes:
            # PUCT formula: Q + c * P * sqrt(N) / (1 + n)
            u = self.c_puct * node.prior_score * math.sqrt(self.total_visits) / (1 + node.visit_count)
            score = node.q_value + u

            if score > best_score:
                best_score = score
                best_node = node

        if best_node:
            best_node.visit_count += 1
            self.total_visits += 1
            return best_node.attempt_id
        return None

    def update(self, attempt_id: str, value: float):
        for node in self.nodes:
            if node.attempt_id == attempt_id:
                node.value_sum += value
                # Note: visit_count is incremented at selection time in this simplified model,
                # or could be incremented here if we consider 'update' as completing the visit.
                # Standard MCTS increments visit on path traversal (selection).
                break
