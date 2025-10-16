from __future__ import annotations

import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

import pytest


@pytest.fixture
def sample_items() -> list[dict[str, str]]:
    return [
        {"id": "t1", "text": "They’re lying to you! Wake up!!"},
        {
            "id": "t2",
            "text": "Sources suggest a delay. Let's verify before jumping to conclusions.",
        },
    ]
