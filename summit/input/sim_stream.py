from typing import List

from summit.input.provider import InputProvider
from summit.input.types import IntentClass, IntentFrame


class SimulatedStreamProvider(InputProvider):
    def poll(self) -> list[IntentFrame]:
        # Simulate a command_decode event every few polls
        return [
            IntentFrame(
                intent_class="command_decode",
                text="play music",
                confidence=0.88,
                meta={"source": "simulated_micromovement"}
            )
        ]
