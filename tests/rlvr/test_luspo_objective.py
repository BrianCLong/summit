from summit.rlvr.objectives import SequenceObjectiveInputs, select_objective
from summit.rlvr.objectives.gspo import gspo_terms
from summit.rlvr.objectives.luspo import luspo_objective, luspo_terms


def test_luspo_scales_by_length() -> None:
    inputs = SequenceObjectiveInputs(
        importance_ratios=[1.0, 1.0],
        advantages=[1.0, 1.0],
        lengths=[2, 4],
        clip_range=0.2,
    )
    gspo = gspo_terms(inputs)
    luspo = luspo_terms(inputs)
    assert gspo == [1.0, 1.0]
    assert luspo == [2.0, 4.0]


def test_luspo_overlong_penalty_applies() -> None:
    inputs = SequenceObjectiveInputs(
        importance_ratios=[1.0],
        advantages=[1.0],
        lengths=[12],
        clip_range=0.2,
    )
    assert luspo_objective(inputs, max_len=10, overlong_penalty=0.5) == 11.0


def test_select_objective_defaults_to_gspo() -> None:
    objective = select_objective("gspo")
    inputs = SequenceObjectiveInputs(
        importance_ratios=[1.0],
        advantages=[1.0],
        lengths=[1],
        clip_range=0.2,
    )
    assert objective(inputs) == 1.0
