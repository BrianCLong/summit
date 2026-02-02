"""
Adversarial Misinformation Defense Platform

A comprehensive platform for detecting and defending against adversarial misinformation
across multiple modalities including text, images, audio, video, memes, and deepfakes.
"""

__version__ = "1.0.0"
__author__ = "Summit Team"

# Import main components
from .adversarial_training import AdversarialTrainingEngine
from .detection_modules.main_detector import AdversarialMisinfoDetector
from .red_blue_team import RedBlueTeamExerciseManager
from .tactic_evolution import AutonomousTacticEvolver
from .validation_suite import ValidationBenchmark
from .bidirectional_temp_control import BidirectionalTemperatureController, BidirectionalProcessor, BidirectionalConfig
from .cognitive_dissonance_modeling import create_cognitive_dissonance_system
from .quantum_inspired_analysis import create_quantum_defense_system
from .neurosymbolic_consciousness_engine import create_neurosymbolic_consciousness_system


# Convenience functions
def create_platform():
    """
    Create and initialize the complete adversarial misinformation defense platform
    """
    from .bidirectional_temp_control import BidirectionalConfig

    detector = AdversarialMisinfoDetector()
    config = BidirectionalConfig()
    controller = BidirectionalTemperatureController(detector, config)

    # Initialize advanced systems
    cognitive_dissonance_system = create_cognitive_dissonance_system()
    quantum_defense_system = create_quantum_defense_system()
    neurosymbolic_consciousness_system = create_neurosymbolic_consciousness_system()

    return {
        "detector": detector,
        "trainer": AdversarialTrainingEngine(),
        "evolver": AutonomousTacticEvolver(),
        "exercise_manager": RedBlueTeamExerciseManager(),
        "validator": ValidationBenchmark(),
        "bidirectional_controller": controller,
        "bidirectional_config": config,
        "cognitive_dissonance_system": cognitive_dissonance_system,
        "quantum_defense_system": quantum_defense_system,
        "neurosymbolic_consciousness_system": neurosymbolic_consciousness_system,
    }


__all__ = [
    "AdversarialMisinfoDetector",
    "AdversarialTrainingEngine",
    "AutonomousTacticEvolver",
    "RedBlueTeamExerciseManager",
    "ValidationBenchmark",
    "BidirectionalTemperatureController",
    "BidirectionalProcessor",
    "BidirectionalConfig",
    "create_cognitive_dissonance_system",
    "create_quantum_defense_system",
    "create_neurosymbolic_consciousness_system",
    "create_platform",
]
