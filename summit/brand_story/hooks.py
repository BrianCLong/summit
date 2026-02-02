from typing import List, Dict, Any
from .flags import enabled

def generate_hooks(theme: str, platform: str = "LinkedIn") -> List[Dict[str, str]]:
    """
    Generate platform-specific hooks.
    """
    if not enabled():
        return []

    hooks = []
    if platform.lower() == "linkedin":
        hooks.append({
            "type": "authority",
            "text": f"Why {theme} is the most underrated asset in your personal brand."
        })
        hooks.append({
            "type": "vulnerability",
            "text": f"I almost failed at {theme}. Here's what I learned."
        })
    elif platform.lower() == "instagram":
        hooks.append({
            "type": "visual",
            "text": f"The secret behind {theme} (swipe for the full story)."
        })

    return hooks
