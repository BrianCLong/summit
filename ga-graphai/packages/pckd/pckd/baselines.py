"""Baseline training routines."""

from __future__ import annotations

from typing import Dict, Tuple

import numpy as np

from .models import LogisticStudent, LogisticTeacher


def knowledge_distillation(
    student: LogisticStudent,
    teacher: LogisticTeacher,
    features: np.ndarray,
    labels: np.ndarray,
    temperature: float = 1.0,
    alpha: float = 0.5,
    learning_rate: float = 0.3,
    epochs: int = 250,
) -> Dict[str, float]:
    """Train the student with a simple KD objective."""

    if temperature <= 0:
        raise ValueError("temperature must be positive")
    if not 0.0 <= alpha <= 1.0:
        raise ValueError("alpha must be between 0 and 1")

    teacher_logits = teacher.predict_logits(features) / temperature
    teacher_probs = 1.0 / (1.0 + np.exp(-teacher_logits))
    hard_targets = labels.astype(np.float64)

    for _ in range(epochs):
        student_logits = student.predict_logits(features) / temperature
        student_probs = 1.0 / (1.0 + np.exp(-student_logits))
        soft_loss_grad = student_probs - teacher_probs
        hard_loss_grad = student_probs - hard_targets
        gradient = alpha * hard_loss_grad + (1 - alpha) * soft_loss_grad
        grad_w = features.T @ gradient / features.shape[0]
        grad_b = float(np.mean(gradient))
        student.weights -= learning_rate * grad_w
        student.bias -= learning_rate * grad_b

    final_logits = student.predict_logits(features)
    final_probs = 1.0 / (1.0 + np.exp(-final_logits))
    loss = -np.mean(
        hard_targets * np.log(final_probs + 1e-9)
        + (1 - hard_targets) * np.log(1 - final_probs + 1e-9)
    )
    return {
        "loss": float(loss),
        "temperature": float(temperature),
        "alpha": float(alpha),
        "learning_rate": float(learning_rate),
        "epochs": float(epochs),
    }


def dpo_alignment_stub(student: LogisticStudent, reference_margin: float = 0.1) -> Tuple[str, float]:
    """Stub for Direct Preference Optimization style alignment."""

    margin = max(reference_margin, 0.0)
    adjustment = margin * np.sign(student.bias)
    student.bias -= adjustment
    return "dpo-stub", float(margin)
