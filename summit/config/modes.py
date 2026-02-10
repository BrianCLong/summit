from enum import Enum

class AgentMode(Enum):
    STANDARD = "standard"
    COMPOSER15_LIKE = "composer15_like"

# Default to standard; composer15_like must be explicitly enabled
DEFAULT_MODE = AgentMode.STANDARD
