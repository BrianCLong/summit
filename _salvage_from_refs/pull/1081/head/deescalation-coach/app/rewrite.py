"""De-escalation rewrite logic."""

from __future__ import annotations

import re
from typing import List, Tuple

from .backends.transformers_backend import TransformersBackend

INSULTS = {"idiot", "stupid", "dumb"}


backend = TransformersBackend()


def _basic_rewrite(text: str) -> str:
    text = re.sub(r"[!?]+", ".", text)
    words = []
    for w in text.split():
        lw = re.sub(r"\d+", "", w.lower())
        if lw.strip(".,") in INSULTS or not lw:
            continue
        words.append(lw)
    return " ".join(words).strip().capitalize()


def rewrite_text(text: str) -> Tuple[str, List[str]]:
    rewritten = _basic_rewrite(text)
    _ = backend.generate(rewritten)
    flags: List[str] = []
    orig_nums = re.findall(r"\d+", text)
    new_nums = re.findall(r"\d+", rewritten)
    if orig_nums != new_nums:
        flags.append("content_drift")
    return rewritten, flags
