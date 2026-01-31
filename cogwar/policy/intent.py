from enum import Enum, auto


class Intent(Enum):
    DEFENSIVE_IW = auto()      # I&W generation, fusion, reporting
    RESILIENCE_DRILL = auto()  # Running drills, checking metrics
    ACADEMIC_RESEARCH = auto() # Summarizing literature, theory
    OFFENSIVE_INFLUENCE = auto() # Targeted persuasion, propaganda, microtargeting
    OFFENSIVE_SUPPORT = auto() # Generating assets for influence campaigns
    UNKNOWN = auto()
