from __future__ import annotations

from typing import Dict

from ..agents.cartographer_stub import CartographerStub
from ..agents.forecaster_stub import ForecasterStub
from ..agents.governor_stub import GovernorStub
from ..agents.scout_stub import ScoutStub
from ..agents.strategist_stub import StrategistStub


def default_agents() -> Dict[str, object]:
    return {
        "scout": ScoutStub(),
        "cartographer": CartographerStub(),
        "forecaster": ForecasterStub(),
        "strategist": StrategistStub(),
        "governor": GovernorStub(),
    }
