from dataclasses import dataclass
from typing import Any, Dict, Optional

import torch
import torch.nn.functional as F


@dataclass(frozen=True)
class OPDConfig:
    mode: str = "full_logits"  # or "top_k"
    top_k: int = 50
    student_data_fraction: float = 0.5
    feature_flag_env: str = "TY_S_OPD"

class OPDTrainer:
    """
    Clean-room skeleton inspired by Typhoon-S OPD: alternate on-policy student rollouts
    with teacher token-prob supervision; supports full-logits vs top-k.
    """
    def __init__(self, cfg: OPDConfig, student_model: Optional[torch.nn.Module] = None, teacher_model: Optional[torch.nn.Module] = None):
        self.cfg = cfg
        self.student_model = student_model
        self.teacher_model = teacher_model

    def train_step(self, batch: dict[str, torch.Tensor]) -> dict[str, Any]:
        """
        Executes a single training step with teacher-in-loop forward pass.
        Computes KL divergence between teacher and student token distributions.
        """
        if self.student_model is None or self.teacher_model is None:
            # Return stub if models are not initialized, preserving original behavior mostly but warning?
            # Or raise error. Logic dictates we can't train.
            return {"status": "error", "message": "Models not initialized", "mode": self.cfg.mode}

        # Student Forward
        # Support both object output (HF style) and tensor output
        student_out = self.student_model(**batch)
        student_logits = student_out.logits if hasattr(student_out, "logits") else student_out

        # Teacher Forward (no grad) - optionally swap/offload logic here
        with torch.no_grad():
            teacher_out = self.teacher_model(**batch)
            teacher_logits = teacher_out.logits if hasattr(teacher_out, "logits") else teacher_out

        # Compute distributions
        student_log_probs = F.log_softmax(student_logits, dim=-1)

        if self.cfg.mode == "top_k":
            # Filter teacher logits to keep only top-k mass, rest -inf
            top_k_vals, top_k_indices = torch.topk(teacher_logits, self.cfg.top_k, dim=-1)

            # Initialize with -inf
            filtered_logits = torch.full_like(teacher_logits, float('-inf'))

            # Scatter top-k values back
            filtered_logits.scatter_(-1, top_k_indices, top_k_vals)

            teacher_probs = F.softmax(filtered_logits, dim=-1)
        else:
            teacher_probs = F.softmax(teacher_logits, dim=-1)

        # Compute KL Divergence (Forward KL: Teacher || Student)
        # kl_div(input, target) -> sum(target * (log(target) - input))
        # input is log-probs, target is probs.
        loss = F.kl_div(student_log_probs, teacher_probs, reduction='batchmean')

        return {
            "loss": loss,
            "status": "success",
            "mode": self.cfg.mode,
            "kl_div": loss.item()
        }
