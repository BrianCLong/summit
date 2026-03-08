from typing import Any, Dict

# Mock registry for the prototype. In reality, this would be backed by an allowlist/registry check API.
# But for the prototype, we assume if it's not in the 'known' set, it might be a hallucination.
KNOWN_REGISTRY = {
    "requests",
    "urllib3",
    "flask",
    "django",
    "numpy",
    "pandas",
    "react",
    "express",
    "lodash",
    "pytest",
    "jest"
}

def analyze_slopsquat(dependency: str, enable_network_check: bool = False) -> dict[str, Any]:
    """
    Analyzes hallucination risk heuristics:
    1. Does the package exist in known registries?
    2. Is it a completely novel name without prior usage?
    """
    is_hallucinated = dependency.lower() not in KNOWN_REGISTRY

    # In a real implementation, enable_network_check could trigger an API call to NPM/PyPI
    # However, performance budget says < 15s and no network in CI by default.

    return {
        "is_hallucinated": is_hallucinated,
        "reason": f"Package '{dependency}' not found in known registry" if is_hallucinated else "Package found in known registry",
        "confidence": 0.8 if is_hallucinated else 1.0 # Simple heuristic confidence
    }
