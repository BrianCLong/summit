"""
Adversarial Misinformation Defense Platform

A comprehensive platform for detecting and defending against adversarial misinformation
across multiple modalities including text, images, audio, video, memes, and deepfakes.
"""

__version__ = "1.0.0"
__author__ = "Summit Team"

# Import main components
from .detection_modules.main_detector import AdversarialMisinfoDetector
from .adversarial_training import AdversarialTrainingEngine
from .tactic_evolution import AutonomousTacticEvolver
from .red_blue_team import RedBlueTeamExerciseManager
from .validation_suite import ValidationBenchmark

# Convenience functions
def create_platform():
    """
    Create and initialize the complete adversarial misinformation defense platform
    """
    return {
        'detector': AdversarialMisinfoDetector(),
        'trainer': AdversarialTrainingEngine(),
        'evolver': AutonomousTacticEvolver(),
        'exercise_manager': RedBlueTeamExerciseManager(),
        'validator': ValidationBenchmark()
    }

__all__ = [
    'AdversarialMisinfoDetector',
    'AdversarialTrainingEngine', 
    'AutonomousTacticEvolver',
    'RedBlueTeamExerciseManager',
    'ValidationBenchmark',
    'create_platform'
]