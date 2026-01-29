import pytest
import os
from summit_ttt.trainer_stub import TrainerStub
from summit_ttt.policies import PolicyViolation

def test_trainer_requires_flag():
    # Ensure flag off
    old_val = os.environ.pop("SUMMIT_TTT_TRAINING_ENABLED", None)
    try:
        trainer = TrainerStub("model.bin")
        with pytest.raises(PolicyViolation, match="Training is not enabled"):
            trainer.train_step([])
    finally:
        if old_val:
            os.environ["SUMMIT_TTT_TRAINING_ENABLED"] = old_val

def test_trainer_runs_with_flag():
    old_val = os.environ.get("SUMMIT_TTT_TRAINING_ENABLED")
    os.environ["SUMMIT_TTT_TRAINING_ENABLED"] = "1"
    try:
        trainer = TrainerStub("model.bin")
        result = trainer.train_step([])
        assert result == "new_adapter_weights_stub"
    finally:
        if old_val:
            os.environ["SUMMIT_TTT_TRAINING_ENABLED"] = old_val
        else:
            del os.environ["SUMMIT_TTT_TRAINING_ENABLED"]
