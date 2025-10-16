"""
Test script for Adversarial Misinformation Defense Platform

This script verifies that all platform components are functioning correctly.
"""
import sys
import os
import logging
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import create_platform
from adversarial_misinfo_defense.validation_suite import ValidationBenchmark
from adversarial_misinfo_defense.adversarial_training import AdversarialTrainingEngine
from adversarial_misinfo_defense.tactic_evolution import AutonomousTacticEvolver
from adversarial_misinfo_defense.red_blue_team import RedBlueTeamExerciseManager


def setup_logging():
    """
    Setup logging for the test
    """
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def test_platform_creation():
    """
    Test that the platform can be created successfully
    """
    print("Testing platform creation...")
    
    try:
        platform = create_platform()
        print("✓ Platform created successfully")
        
        # Test individual components
        components = ['detector', 'trainer', 'evolver', 'exercise_manager', 'validator']
        for component in components:
            if component in platform:
                print(f"✓ {component.capitalize()} component loaded")
            else:
                print(f"✗ {component.capitalize()} component missing")
                return False
        
        return True
    except Exception as e:
        print(f"✗ Error creating platform: {str(e)}")
        return False


def test_detector_component():
    """
    Test detector component functionality
    """
    print("\nTesting detector component...")
    
    try:
        platform = create_platform()
        detector = platform['detector']
        
        # Test that detector has required methods
        required_methods = [
            'detect_text_misinfo',
            'detect_image_misinfo',
            'detect_audio_misinfo',
            'detect_video_misinfo',
            'detect_meme_misinfo',
            'detect_deepfake_misinfo'
        ]
        
        for method in required_methods:
            if hasattr(detector, method):
                print(f"✓ {method} method available")
            else:
                print(f"✗ {method} method missing")
                return False
        
        # Test basic text detection (mock data)
        sample_texts = [
            "This is a test text for misinformation detection.",
            "Another sample text for analysis."
        ]
        
        results = detector.detect_text_misinfo(sample_texts)
        if len(results) == len(sample_texts):
            print("✓ Text detection returns correct number of results")
        else:
            print("✗ Text detection returns incorrect number of results")
            return False
        
        return True
    except Exception as e:
        print(f"✗ Error testing detector: {str(e)}")
        return False


def test_validation_benchmark():
    """
    Test validation benchmark functionality
    """
    print("\nTesting validation benchmark...")
    
    try:
        validator = ValidationBenchmark()
        
        # Test that validator has required methods
        required_methods = [
            'run_comprehensive_validation',
            'generate_validation_report',
            'save_validation_results'
        ]
        
        for method in required_methods:
            if hasattr(validator, method):
                print(f"✓ {method} method available")
            else:
                print(f"✗ {method} method missing")
                return False
        
        print("✓ Validation benchmark initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Error testing validation benchmark: {str(e)}")
        return False


def test_adversarial_training():
    """
    Test adversarial training engine functionality
    """
    print("\nTesting adversarial training engine...")
    
    try:
        trainer = AdversarialTrainingEngine()
        
        # Test that trainer has required methods
        required_methods = [
            'train_gan',
            'generate_adversarial_samples',
            'extend_detection_libraries_with_llm',
            'run_adversarial_training_cycle'
        ]
        
        for method in required_methods:
            if hasattr(trainer, method):
                print(f"✓ {method} method available")
            else:
                print(f"✗ {method} method missing")
                return False
        
        print("✓ Adversarial training engine initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Error testing adversarial training engine: {str(e)}")
        return False


def test_tactic_evolution():
    """
    Test autonomous tactic evolver functionality
    """
    print("\nTesting autonomous tactic evolver...")
    
    try:
        evolver = AutonomousTacticEvolver()
        
        # Test that evolver has required methods
        required_methods = [
            'register_threat_actor',
            'register_tactic',
            'update_actor_behavior',
            'evolve_tactics_based_on_detection_rates'
        ]
        
        for method in required_methods:
            if hasattr(evolver, method):
                print(f"✓ {method} method available")
            else:
                print(f"✗ {method} method missing")
                return False
        
        print("✓ Autonomous tactic evolver initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Error testing autonomous tactic evolver: {str(e)}")
        return False


def test_red_blue_team():
    """
    Test red/blue team exercise manager functionality
    """
    print("\nTesting red/blue team exercise manager...")
    
    try:
        manager = RedBlueTeamExerciseManager()
        
        # Test that manager has required methods
        required_methods = [
            'create_scenario',
            'modify_scenario',
            'validate_scenario',
            'start_exercise_session',
            'get_all_scenarios'
        ]
        
        for method in required_methods:
            if hasattr(manager, method):
                print(f"✓ {method} method available")
            else:
                print(f"✗ {method} method missing")
                return False
        
        # Test creating a basic scenario
        scenario = manager.create_scenario(
            name="Test Scenario",
            description="A test scenario for validation",
            exercise_type="social_engineering",
            difficulty="beginner",
            objectives=["Test objective 1", "Test objective 2"],
            created_by="Test User"
        )
        
        if scenario:
            print("✓ Scenario creation successful")
        else:
            print("✗ Scenario creation failed")
            return False
        
        print("✓ Red/blue team exercise manager initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Error testing red/blue team exercise manager: {str(e)}")
        return False


def run_all_tests():
    """
    Run all platform tests
    """
    setup_logging()
    
    print("=" * 60)
    print("ADVERSARIAL MISINFORMATION DEFENSE PLATFORM - TEST SUITE")
    print("=" * 60)
    
    # Run individual tests
    tests = [
        ("Platform Creation", test_platform_creation),
        ("Detector Component", test_detector_component),
        ("Validation Benchmark", test_validation_benchmark),
        ("Adversarial Training", test_adversarial_training),
        ("Tactic Evolution", test_tactic_evolution),
        ("Red/Blue Team", test_red_blue_team)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n[{test_name}]")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ Test failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{test_name:<30} {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("-" * 60)
    print(f"TOTAL: {len(results)} tests")
    print(f"PASSED: {passed}")
    print(f"FAILED: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed! Platform is ready for use.")
        return 0
    else:
        print(f"\n⚠️  {failed} tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())