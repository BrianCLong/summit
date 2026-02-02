from typing import List, Dict, Any
from .flags import enabled
from .schemas import BrandStoryInput, Episode, SeriesPlan
from .policy import BrandStoryPolicy

def plan_series(input_data: BrandStoryInput, episode_count: int = 5) -> Dict[str, Any]:
    """
    Deterministic series planner based on storytelling primitives.
    """
    if not enabled():
        return {"enabled": False, "reason": "BRAND_STORY_ENABLED=false"}

    policy = BrandStoryPolicy()
    episodes = []
    for i in range(episode_count):
        moment = input_data.defining_moments[i % max(1, len(input_data.defining_moments))]

        # Primitive: Hook -> Tension -> Twist -> Lesson -> CTA -> Cliffhanger
        hook = f"I remember when {moment}. It seemed like the end."

        # Policy check (minimal)
        if not policy.validate_content(hook)["is_safe"]:
            hook = policy.redact_content(hook)

        episodes.append(Episode(
            title=f"Episode {i+1}: {moment[:20]}...",
            hook=hook,
            tension="The pressure mounted as I realized I was out of my depth.",
            twist="But then, a shift in perspective changed everything.",
            lesson=f"My mission is {input_data.mission}, and this moment proved why.",
            cta="Have you ever faced a similar turning point?",
            cliffhanger="Next time, I'll share the one decision that fixed it all.",
            interactive_prompt="Vote: Which part of this story resonated most? A/B"
        ))

    plan = SeriesPlan(mission=input_data.mission, episodes=episodes)
    return {
        "enabled": True,
        "plan": {
            "mission": plan.mission,
            "platform": plan.platform,
            "episodes": [e.__dict__ for e in plan.episodes]
        }
    }
