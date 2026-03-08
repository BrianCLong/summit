from typing import Any, Dict, List

from .flags import enabled
from .schemas import BrandStoryInput, Episode, SeriesPlan


def plan_series(input_data: BrandStoryInput, episodes_count: int = 5) -> SeriesPlan:
    """
    Deterministic, template-based planner.
    """
    if not enabled():
        return SeriesPlan(mission=input_data.mission, episodes=[], enabled=False, metadata={"reason": "BRAND_STORY_ENABLED=false"})

    planned = []
    moments = input_data.defining_moments

    for i in range(episodes_count):
        moment = moments[i % max(1, len(moments))]
        # Clean-room derivation of storytelling primitives
        episode = Episode(
            title=f"Episode {i+1}",
            hook=f"What if {moment} changed everything?",
            tension="The obstacle got real.",
            twist="An unexpected turn reframed the problem.",
            lesson=f"Lesson aligned to mission: {input_data.mission}",
            cta="Ask: have you faced something similar?",
            cliffhanger="Next time: the decision point.",
            interactive_prompt="Vote: what should happen next? A/B"
        )
        planned.append(episode)

    return SeriesPlan(
        mission=input_data.mission,
        episodes=planned,
        enabled=True
    )
