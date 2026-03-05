from typing import Dict, List, Tuple

# A small subset of popular packages for the prototype
POPULAR_PACKAGES = {
    "requests",
    "urllib3",
    "flask",
    "django",
    "numpy",
    "pandas",
    "react",
    "express",
    "lodash"
}

def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate the Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]

def normalize_confusables(name: str) -> str:
    """Normalize simple homoglyphs/confusables."""
    return name.replace('1', 'l').replace('0', 'o').lower()

def detect_typosquat(dependency: str, threshold: int = 1) -> tuple[bool, list[str]]:
    """
    Checks if a dependency name is a lookalike of a popular package.
    Returns (is_typosquat, list of similar packages).
    """
    normalized_dep = normalize_confusables(dependency)

    # If the dependency exactly matches a popular one after normalization, we don't flag it as typosquat
    if normalized_dep in POPULAR_PACKAGES or dependency.lower() in POPULAR_PACKAGES:
        return False, []

    similar_packages = []
    for pop_pkg in POPULAR_PACKAGES:
        norm_pop_pkg = normalize_confusables(pop_pkg)

        # Calculate distance. If length difference is greater than threshold, it can't be closer.
        if abs(len(normalized_dep) - len(norm_pop_pkg)) > threshold:
            continue

        dist = levenshtein_distance(normalized_dep, norm_pop_pkg)
        if dist <= threshold:
            similar_packages.append(pop_pkg)

    return len(similar_packages) > 0, similar_packages
