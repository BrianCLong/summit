from typing import List
from .flags import enabled

def generate_hooks(topic: str, platform: str) -> List[str]:
    if not enabled():
        return []

    # Clean-room derived patterns
    # 1. The "What if" hook
    # 2. The "Stop doing this" hook
    # 3. The "I learned this the hard way" hook

    hooks = [
        f"What if {topic} isn't what you think?",
        f"Stop ignoring {topic} if you want results.",
        f"I learned the truth about {topic} the hard way.",
    ]

    if platform.lower() == "linkedin":
        hooks.append(f"Unpopular opinion: {topic} matters more than ROI.")
    elif platform.lower() == "instagram":
        hooks.append(f"POV: You just discovered {topic}.")

    return hooks
