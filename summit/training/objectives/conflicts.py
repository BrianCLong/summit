from typing import List, Tuple
from .registry import TrainingObjective

def check_conflicts(objectives: List[TrainingObjective]) -> List[Tuple[str, str, str]]:
    """
    Returns a list of conflicts (obj1_name, obj2_name, reason).
    Checks for direct opposition in intended effects (e.g., maximize_X vs minimize_X).
    """
    conflicts = []
    # O(N^2) check
    for i in range(len(objectives)):
        for j in range(i + 1, len(objectives)):
            o1 = objectives[i]
            o2 = objectives[j]

            # Check for direct opposition in intended effects
            # e.g. "maximize_X" vs "minimize_X"
            for effect in o1.intended_effects:
                if effect.startswith("maximize_"):
                    term = effect.replace("maximize_", "")
                    if f"minimize_{term}" in o2.intended_effects:
                         conflicts.append((o1.name, o2.name, f"Opposing effects on {term}"))
                elif effect.startswith("minimize_"):
                    term = effect.replace("minimize_", "")
                    if f"maximize_{term}" in o2.intended_effects:
                         conflicts.append((o1.name, o2.name, f"Opposing effects on {term}"))

    return conflicts
