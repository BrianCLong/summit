from typing import List, Dict, Any
from .flags import enabled
from .schemas import Episode, BrandStoryInput
from .voice import AuthenticityLinter
from .policy import check_policy

def plan_series(input_data: BrandStoryInput, episodes: int = 5) -> Dict[str, Any]:
    if not enabled():
        return {"enabled": False, "reason": "BRAND_STORY_ENABLED=false"}

    planned = []
    for i in range(episodes):
        moment = input_data.defining_moments[i % max(1, len(input_data.defining_moments))]
        ep = Episode(
            title=f"Episode {i+1}",
            hook=f"What if {moment} changed everything?",
            tension="The obstacle got real.",
            twist="An unexpected turn reframed the problem.",
            lesson=f"Lesson aligned to mission: {input_data.mission}",
            cta="Ask: have you faced something similar?",
            cliffhanger="Next time: the decision point.",
            interactive_prompt=f"Vote: What should happen next? A/B"
        )
        planned.append(ep.__dict__)

    result = {
        "enabled": True,
        "mission": input_data.mission,
        "episodes": planned,
    }
    policy_verdict = check_policy(result)
    result["policy_verdict"] = policy_verdict
    return result
