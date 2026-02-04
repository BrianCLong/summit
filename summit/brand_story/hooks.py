from typing import Dict, List

def generate_hooks(episode_theme: str, platforms: List[str]) -> Dict[str, str]:
    """Generate platform-specific interactive hooks."""
    hooks = {}
    for platform in platforms:
        p = platform.lower()
        if p == "instagram":
            hooks[platform] = f"Poll: Have you ever felt {episode_theme}? Yes/No"
        elif p == "linkedin":
            hooks[platform] = f"Question: How does {episode_theme} impact your leadership style?"
        else:
            hooks[platform] = f"What do you think about {episode_theme}?"
    return hooks
