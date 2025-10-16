"""
Test suite for Adversarial Misinformation Defense Platform

This module contains tests to verify that all platform components are working correctly.
"""
import unittest
import sys
from pathlib import Path
import logging

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import create_platform
from adversarial_misinfo_defense.validation_suite import ValidationBenchmark
from adversarial_misinfo_defense.red_blue_team import RedBlueTeamExerciseManager
from adversarial_misinfo_defense.adversarial_training import AdversarialTrainingEngine
from adversarial_misinfo_defense.tactic_evolution import AutonomousTacticEvolver


class TestAdversarialMisinfoDefensePlatform(unittest.TestCase):
    """
    Test cases for the Adversarial Misinformation Defense Platform
    """
    
    def setUp(self):
        """
        Set up test fixtures
        """
        self.platform = create_platform()
        self.logger = logging.getLogger(__name__)
    
    def test_platform_creation(self):
        """
        Test that the platform can be created successfully
        """
        self.assertIsNotNone(self.platform)
        self.assertIsInstance(self.platform, dict)
        
        # Check that all required components are present
        required_components = ['detector', 'trainer', 'evolver', 'exercise_manager', 'validator']
        for component in required_components:
            self.assertIn(component, self.platform)
            self.assertIsNotNone(self.platform[component])
    
    def test_detector_component(self):
        """
        Test that the detector component is properly initialized
        """
        detector = self.platform['detector']
        self.assertIsNotNone(detector)
        
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
            self.assertTrue(hasattr(detector, method), f"Detector missing method: {method}")
    
    def test_validation_benchmark(self):
        """
        Test that validation benchmark can be created
        """
        validator = ValidationBenchmark()
        self.assertIsNotNone(validator)
        
        # Test that validator has required methods
        required_methods = [
            'run_comprehensive_validation',
            'generate_validation_report',
            'save_validation_results'
        ]
        
        for method in required_methods:
            self.assertTrue(hasattr(validator, method), f"Validator missing method: {method}")
    
    def test_red_blue_team_exercise_manager(self):
        """
        Test that red/blue team exercise manager can be created
        """
        manager = RedBlueTeamExerciseManager()
        self.assertIsNotNone(manager)
        
        # Test that manager has required methods
        required_methods = [
            'create_scenario',
            'modify_scenario',
            'validate_scenario',
            'start_exercise_session'
        ]
        
        for method in required_methods:
            self.assertTrue(hasattr(manager, method), f"Manager missing method: {method}")
    
    def test_adversarial_training_engine(self):
        """
        Test that adversarial training engine can be created
        """
        trainer = AdversarialTrainingEngine()
        self.assertIsNotNone(trainer)
        
        # Test that trainer has required methods
        required_methods = [
            'train_gan',
            'generate_adversarial_samples',
            'extend_detection_libraries_with_llm',
            'run_adversarial_training_cycle'
        ]
        
        for method in required_methods:
            self.assertTrue(hasattr(trainer, method), f"Trainer missing method: {method}")
    
    def test_autonomous_tactic_evolver(self):
        """
        Test that autonomous tactic evolver can be created
        """
        evolver = AutonomousTacticEvolver()
        self.assertIsNotNone(evolver)
        
        # Test that evolver has required methods
        required_methods = [
            'register_threat_actor',
            'register_tactic',
            'update_actor_behavior',
            'evolve_tactics_based_on_detection_rates'
        ]
        
        for method in required_methods:
            self.assertTrue(hasattr(evolver, method), f"Evolver missing method: {method}")
    
    def test_text_detection_functionality(self):
        """
        Test basic text detection functionality
        """
        detector = self.platform['detector']
        
        # Test with sample text
        sample_texts = [
            "This shocking revelation will change everything you thought you knew!",
            "Research shows balanced diets and regular exercise are beneficial."
        ]
        
        results = detector.detect_text_misinfo(sample_texts)
        self.assertEqual(len(results), len(sample_texts))
        
        # Check that results have expected structure
        for result in results:
            self.assertIn('misinfo_score', result)
            self.assertIn('confidence', result)
            self.assertIn('is_misinfo', result)
            self.assertIsInstance(result['misinfo_score'], (int, float))
            self.assertIsInstance(result['confidence'], (int, float))
            self.assertIsInstance(result['is_misinfo'], bool)
    
    def test_image_detection_functionality(self):
        """
        Test basic image detection functionality (mocked)
        """
        detector = self.platform['detector']
        
        # Test with sample image paths (mocked)
        sample_images = ["/path/to/sample/image1.jpg", "/path/to/sample/image2.png"]
        
        # This would normally process actual images, but for testing we'll mock the results
        results = detector.detect_image_misinfo(sample_images)
        self.assertEqual(len(results), len(sample_images))
        
        # Check that results have expected structure
        for result in results:
            self.assertIn('misinfo_score', result)
            self.assertIn('confidence', result)
            self.assertIn('is_misinfo', result)
            self.assertIsInstance(result['misinfo_score'], (int, float))
            self.assertIsInstance(result['confidence'], (int, float))
            self.assertIsInstance(result['is_misinfo'], bool)
    
    def test_audio_detection_functionality(self):
        """
        Test basic audio detection functionality (mocked)
        """
        detector = self.platform['detector']
        
        # Test with sample audio paths (mocked)
        sample_audio = ["/path/to/sample/audio1.wav"]
        
        # This would normally process actual audio, but for testing we'll mock the results
        results = detector.detect_audio_misinfo(sample_audio)
        self.assertEqual(len(results), len(sample_audio))
        
        # Check that results have expected structure
        for result in results:
            self.assertIn('misinfo_score', result)
            self.assertIn('confidence', result)
            self.assertIn('is_misinfo', result)
            self.assertIsInstance(result['misinfo_score'], (int, float))
            self.assertIsInstance(result['confidence'], (int, float))
            self.assertIsInstance(result['is_misinfo'], bool)
    
    def test_video_detection_functionality(self):
        """
        Test basic video detection functionality (mocked)
        """
        detector = self.platform['detector']
        
        # Test with sample video paths (mocked)
        sample_videos = ["/path/to/sample/video1.mp4"]
        
        # This would normally process actual videos, but for testing we'll mock the results
        results = detector.detect_video_misinfo(sample_videos)
        self.assertEqual(len(results), len(sample_videos))
        
        # Check that results have expected structure
        for result in results:
            self.assertIn('misinfo_score', result)
            self.assertIn('confidence', result)
            self.assertIn('is_misinfo', result)
            self.assertIsInstance(result['misinfo_score'], (int, float))
            self.assertIsInstance(result['confidence'], (int, float))
            self.assertIsInstance(result['is_misinfo'], bool)
    
    def test_meme_detection_functionality(self):
        """
        Test basic meme detection functionality (mocked)
        """
        detector = self.platform['detector']
        
        # Test with sample meme paths (mocked)
        sample_memes = ["/path/to/sample/meme1.jpg"]
        
        # This would normally process actual memes, but for testing we'll mock the results
        results = detector.detect_meme_misinfo(sample_memes)
        self.assertEqual(len(results), len(sample_memes))
        
        # Check that results have expected structure
        for result in results:
            self.assertIn('misinfo_score', result)
            self.assertIn('confidence', result)
            self.assertIn('is_misinfo', result)
            self.assertIsInstance(result['misinfo_score'], (int, float))
            self.assertIsInstance(result['confidence'], (int, float))
            self.assertIsInstance(result['is_misinfo'], bool)
    
    def test_deepfake_detection_functionality(self):
        """
        Test basic deepfake detection functionality (mocked)
        """
        detector = self.platform['detector']
        
        # Test with sample media paths and types (mocked)
        sample_media = ["/path/to/sample/deepfake1.mp4"]
        sample_types = ["video"]
        
        # This would normally process actual media, but for testing we'll mock the results
        results = detector.detect_deepfake_misinfo(sample_media, sample_types)
        self.assertEqual(len(results), len(sample_media))
        
        # Check that results have expected structure
        for result in results:
            self.assertIn('misinfo_score', result)
            self.assertIn('confidence', result)
            self.assertIn('is_misinfo', result)
            self.assertIsInstance(result['misinfo_score'], (int, float))
            self.assertIsInstance(result['confidence'], (int, float))
            self.assertIsInstance(result['is_misinfo'], bool)


def run_tests():
    """
    Run all tests in the test suite
    """
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestAdversarialMisinfoDefensePlatform)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return exit code based on test results
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(run_tests())