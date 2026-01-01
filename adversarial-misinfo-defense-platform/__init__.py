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
from .enhanced_detection import EnsembleDetector, AdaptiveDetector, RealTimeDetector, create_enhanced_platform
from .advanced_testing import ComponentTester, PerformanceTester, run_advanced_tests
from .security_enhancements import SecurityScanner, SecureInputValidator, SecureCommunication, SecurityHardener, perform_security_audit
from .performance_optimization import PerformanceOptimizer, GPUAccelerator, ResourceMonitor, OptimizedAdversarialDetector, optimize_platform_performance
from .summit_integration import SummitIntegration, SummitAPIAdapter, CognitiveDefenseIntegrator, create_summit_integration


# Convenience functions
def create_platform():
    """
    Create and initialize the complete adversarial misinformation defense platform
    """
    return {
        "detector": AdversarialMisinfoDetector(),
        "trainer": AdversarialTrainingEngine(),
        "evolver": AutonomousTacticEvolver(),
        "exercise_manager": RedBlueTeamExerciseManager(),
        "validator": ValidationBenchmark(),
    }


def create_enhanced_platform():
    """
    Create and initialize the enhanced adversarial misinformation defense platform
    with additional features like ensemble detection, adaptive learning, and real-time processing
    """
    from .enhanced_detection import create_enhanced_platform as create_enhanced
    return create_enhanced()


__all__ = [
    "AdversarialMisinfoDetector",
    "AdversarialTrainingEngine",
    "AutonomousTacticEvolver",
    "RedBlueTeamExerciseManager",
    "ValidationBenchmark",
    "EnsembleDetector",
    "AdaptiveDetector",
    "RealTimeDetector",
    "ComponentTester",
    "PerformanceTester",
    "SecurityScanner",
    "SecureInputValidator",
    "SecureCommunication",
    "SecurityHardener",
    "PerformanceOptimizer",
    "GPUAccelerator",
    "ResourceMonitor",
    "OptimizedAdversarialDetector",
    "SummitIntegration",
    "SummitAPIAdapter",
    "CognitiveDefenseIntegrator",
    "create_platform",
    "create_enhanced_platform",
    "run_advanced_tests",
    "perform_security_audit",
    "optimize_platform_performance",
    "create_summit_integration",
]
