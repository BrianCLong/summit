from dataclasses import dataclass
from typing import Optional, Protocol


@dataclass(frozen=True)
class Hint:
    text: str
    level: int  # ℓ in {0..L}

class HintGenerator(Protocol):
    def generate(self, *, prompt: str, reference: Optional[str], level: int, seed: int) -> Hint:
        ...
