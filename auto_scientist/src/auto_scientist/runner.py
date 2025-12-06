from __future__ import annotations
from dataclasses import dataclass
from typing import Callable
from .graph import ExperimentGraph
from .schemas import Node, NodeType, Edge, EdgeType
from .telemetry import TelemetryLogger


@dataclass
class ExperimentRunner:
    train_fn: Callable[[dict], dict]  # config -> {"metrics": {...}, "artifacts": {...}}
    telemetry: TelemetryLogger

    def run_experiment(self, graph: ExperimentGraph, config: dict, stage: str) -> Node:
        self.telemetry.log_event("run_start", {"stage": stage, "config": config})
        result = self.train_fn(config)
        eval_node = Node.new(
            type_=NodeType.EVAL,
            payload={"config": config, **result},
            stage=stage,
        )
        graph.add_node(eval_node)
        self.telemetry.log_event("run_end", {"stage": stage, "node_id": eval_node.id, "result": result})
        return eval_node
