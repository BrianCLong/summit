import logging
import random
from typing import Any, Callable, Dict, List, Optional
from ..config.sage import SAGEConfig
from ..hints.base import HintGenerator

log = logging.getLogger("summit.rl.sage")

class SageRolloutWrapper:
    """
    Wraps a rollout function to inject privileged hints during training.
    Implements SAGE: Self-Hint Aligned GRPO with Privileged Supervision.
    """
    def __init__(self,
                 rollout_fn: Callable[..., Any],
                 config: SAGEConfig,
                 hint_generator: Optional[HintGenerator] = None):
        self.rollout_fn = rollout_fn
        self.config = config
        self.hint_generator = hint_generator

    def __call__(self,
                 prompts: List[str],
                 references: Optional[List[str]] = None,
                 mode: str = "train",
                 **kwargs) -> Any:

        # STRICT: If inference, force hints off
        if mode == "inference" or not self.config.enabled:
            if mode == "inference" and self.config.inference_enabled:
                 # This should be caught by config validation, but double check
                 log.critical("SAGE hints enabled during inference! Forcing OFF.")
            return self.rollout_fn(prompts, references=references, mode=mode, **kwargs)

        # Inject hints
        hinted_prompts = []
        for i, prompt in enumerate(prompts):
            if self.hint_generator and references and i < len(references):
                # Sample level from config
                level = random.choice(self.config.hint_levels)
                # Use a random seed or passed seed
                seed = kwargs.get("seed", 0) + i

                hint = self.hint_generator.generate(
                    prompt=prompt,
                    reference=references[i],
                    level=level,
                    seed=seed
                )

                # Append hint to prompt. Format: "Prompt\nHint: <hint>"
                # In production, this template should be configurable.
                hinted_prompt = f"{prompt}\nHint: {hint.text}"
                hinted_prompts.append(hinted_prompt)
            else:
                hinted_prompts.append(prompt)

        # Call original rollout with hinted prompts
        # We pass 'original_prompts' in kwargs so the reward function
        # (if it uses kwargs) can access the un-hinted prompt if needed.
        return self.rollout_fn(
            hinted_prompts,
            references=references,
            mode=mode,
            original_prompts=prompts,
            **kwargs
        )
