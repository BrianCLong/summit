"""Constraint plugin implementations."""

from .registry import ConstraintRegistry

# Register built-in constraint order.
ConstraintRegistry.register("assignment", "dro.constraints.assignment.AssignmentConstraint")
ConstraintRegistry.register("residency", "dro.constraints.residency.ResidencyConstraint")
ConstraintRegistry.register("latency", "dro.constraints.latency.LatencyConstraint")
ConstraintRegistry.register("replicas", "dro.constraints.replicas.ReplicaConstraint")

__all__ = ["ConstraintRegistry"]
