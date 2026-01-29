import pytest
from summit.training.objectives.registry import TrainingObjective
from summit.training.objectives.conflicts import check_conflicts

def test_no_conflicts():
    o1 = TrainingObjective("obj1", "d1", 1, "low", ["maximize_accuracy"], [])
    o2 = TrainingObjective("obj2", "d2", 1, "low", ["minimize_latency"], [])
    assert not check_conflicts([o1, o2])

def test_direct_conflict():
    o1 = TrainingObjective("obj1", "d1", 1, "low", ["maximize_variance"], [])
    o2 = TrainingObjective("obj2", "d2", 1, "low", ["minimize_variance"], [])
    conflicts = check_conflicts([o1, o2])
    assert len(conflicts) == 1
    assert conflicts[0][2] == "Opposing effects on variance"
