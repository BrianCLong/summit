"""
Example Usage of Adversarial Misinformation Defense Platform

This script demonstrates how to use the platform for detecting and defending
against adversarial misinformation across multiple modalities.
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import create_platform
from adversarial_misinfo_defense.red_blue_team import RedBlueTeamExerciseManager
from adversarial_misinfo_defense.validation_suite import ValidationBenchmark


def example_platform_creation():
    """
    Example of creating and initializing the complete platform
    """
    print("=" * 60)
    print("EXAMPLE: Creating Adversarial Misinformation Defense Platform")
    print("=" * 60)

    try:
        # Create the complete platform
        platform = create_platform()
        print("✓ Platform created successfully!")

        # Show platform components
        print("\nPlatform Components:")
        for component_name in platform.keys():
            print(f"  - {component_name}: {type(platform[component_name]).__name__}")

        return platform
    except Exception as e:
        print(f"❌ Error creating platform: {str(e)}")
        return None


def example_text_detection(platform):
    """
    Example of text-based misinformation detection
    """
    if not platform:
        return

    print("\n" + "=" * 60)
    print("EXAMPLE: Text-Based Misinformation Detection")
    print("=" * 60)

    try:
        # Get detector
        detector = platform["detector"]

        # Sample text to analyze
        sample_texts = [
            "SHOCKING: Scientists refuse to release this groundbreaking discovery!",
            "BREAKING: Government conspiracy exposed by anonymous whistleblower",
            "You won't believe what doctors don't want you to know about this miracle cure!",
            "Research shows balanced diets and regular exercise are beneficial.",
            "According to peer-reviewed studies, vaccination has saved millions of lives.",
            "Historical analysis reveals complex factors in geopolitical events.",
        ]

        print("Analyzing text samples for misinformation...")
        results = detector.detect_text_misinfo(sample_texts)

        print("\nDetection Results:")
        for i, (text, result) in enumerate(zip(sample_texts, results, strict=False)):
            misinfo_score = result.get("misinfo_score", 0.0)
            confidence = result.get("confidence", 0.0)
            is_misinfo = result.get("is_misinfo", False)

            status = "MISINFORMATION" if is_misinfo else "LEGITIMATE"
            print(f"\nSample {i+1}:")
            print(f"  Text: \"{text[:50]}{'...' if len(text) > 50 else ''}\"")
            print(f"  Misinfo Score: {misinfo_score:.3f}")
            print(f"  Confidence: {confidence:.3f}")
            print(f"  Classification: {status}")

        print("\n✓ Text detection completed successfully!")
        return results
    except Exception as e:
        print(f"❌ Error during text detection: {str(e)}")
        return None


def example_image_detection(platform):
    """
    Example of image-based misinformation detection
    """
    if not platform:
        return

    print("\n" + "=" * 60)
    print("EXAMPLE: Image-Based Misinformation Detection")
    print("=" * 60)

    try:
        # Get detector
        detector = platform["detector"]

        # Sample image paths (these would be real paths in practice)
        sample_images = [
            "/path/to/sample/meme1.jpg",
            "/path/to/sample/photo1.jpg",
            "/path/to/sample/manipulated_image.png",
        ]

        print("Analyzing image samples for manipulation...")
        results = detector.detect_image_misinfo(sample_images)

        print("\nDetection Results:")
        for i, (image_path, result) in enumerate(zip(sample_images, results, strict=False)):
            misinfo_score = result.get("misinfo_score", 0.0)
            confidence = result.get("confidence", 0.0)
            is_manipulated = result.get("is_manipulated", False)

            status = "MANIPULATED" if is_manipulated else "LEGITIMATE"
            print(f"\nImage {i+1}:")
            print(f"  Path: {image_path}")
            print(f"  Misinfo Score: {misinfo_score:.3f}")
            print(f"  Confidence: {confidence:.3f}")
            print(f"  Classification: {status}")

        print("\n✓ Image detection completed successfully!")
        return results
    except Exception as e:
        print(f"❌ Error during image detection: {str(e)}")
        return None


def example_audio_detection(platform):
    """
    Example of audio-based misinformation detection
    """
    if not platform:
        return

    print("\n" + "=" * 60)
    print("EXAMPLE: Audio-Based Misinformation Detection")
    print("=" * 60)

    try:
        # Get detector
        detector = platform["detector"]

        # Sample audio paths (these would be real paths in practice)
        sample_audio = ["/path/to/sample/audio1.wav", "/path/to/sample/real_recording.mp3"]

        print("Analyzing audio samples for deepfakes...")
        results = detector.detect_audio_misinfo(sample_audio)

        print("\nDetection Results:")
        for i, (audio_path, result) in enumerate(zip(sample_audio, results, strict=False)):
            misinfo_score = result.get("misinfo_score", 0.0)
            confidence = result.get("confidence", 0.0)
            is_deepfake = result.get("is_deepfake", False)

            status = "DEEPFAKE" if is_deepfake else "LEGITIMATE"
            print(f"\nAudio {i+1}:")
            print(f"  Path: {audio_path}")
            print(f"  Misinfo Score: {misinfo_score:.3f}")
            print(f"  Confidence: {confidence:.3f}")
            print(f"  Classification: {status}")

        print("\n✓ Audio detection completed successfully!")
        return results
    except Exception as e:
        print(f"❌ Error during audio detection: {str(e)}")
        return None


def example_validation_benchmark():
    """
    Example of running validation benchmarks
    """
    print("\n" + "=" * 60)
    print("EXAMPLE: Validation Benchmark")
    print("=" * 60)

    try:
        # Create validation benchmark
        validator = ValidationBenchmark()

        print("Running comprehensive validation...")
        results = validator.run_comprehensive_validation()

        # Generate report
        report = validator.generate_validation_report(results)

        print("\nValidation Report:")
        print(report[:1000] + "..." if len(report) > 1000 else report)

        print("\n✓ Validation benchmark completed successfully!")
        return results
    except Exception as e:
        print(f"❌ Error during validation: {str(e)}")
        return None


def example_red_blue_team_exercises():
    """
    Example of red/blue team exercise management
    """
    print("\n" + "=" * 60)
    print("EXAMPLE: Red/Blue Team Exercises")
    print("=" * 60)

    try:
        # Create exercise manager
        manager = RedBlueTeamExerciseManager()

        # List scenarios
        scenarios = manager.get_all_scenarios()
        print(f"Found {len(scenarios)} scenarios:")
        for scenario in scenarios:
            print(f"  - {scenario.name} ({scenario.difficulty.value})")

        # Create a new scenario
        if scenarios:
            print(f"\nUsing existing scenario: {scenarios[0].name}")
        else:
            print("\nCreating new scenario...")
            scenario = manager.create_scenario(
                name="Social Media Influence Campaign",
                description="Simulate a coordinated social media influence operation",
                exercise_type="social_engineering",
                difficulty="intermediate",
                objectives=[
                    "Detect coordinated account behavior patterns",
                    "Identify inauthentic engagement and amplification",
                    "Trace information flow manipulation techniques",
                ],
                created_by="Example User",
            )
            print(f"✓ Created scenario: {scenario.name}")

        print("\n✓ Red/blue team exercises demonstrated successfully!")
        return True
    except Exception as e:
        print(f"❌ Error during red/blue team exercises: {str(e)}")
        return False


def example_adversarial_training(platform):
    """
    Example of adversarial training
    """
    if not platform:
        return

    print("\n" + "=" * 60)
    print("EXAMPLE: Adversarial Training")
    print("=" * 60)

    try:
        # Get trainer
        trainer = platform["trainer"]

        # Run adversarial training cycle
        print("Running adversarial training cycle...")
        training_results = trainer.run_adversarial_training_cycle(
            modalities=["text", "image"], epochs_per_gan=50, samples_per_modality=25
        )

        print("\nTraining Results:")
        print(f"  Cycle ID: {training_results.get('cycle_id', 'N/A')}")
        print(f"  Duration: {training_results.get('duration_seconds', 0):.2f} seconds")
        print(f"  Completed: {training_results.get('cycle_completed', False)}")

        modality_results = training_results.get("modality_results", {})
        for modality, mod_results in modality_results.items():
            print(f"  {modality.capitalize()} Training:")
            if "error" in mod_results:
                print(f"    Error: {mod_results['error']}")
            else:
                print(f"    Accuracy: {mod_results.get('final_accuracy', 0.0):.3f}")

        adversarial_samples = training_results.get("adversarial_samples_generated", {})
        total_samples = sum(adversarial_samples.values())
        print(f"  Generated {total_samples} adversarial samples")

        print("\n✓ Adversarial training completed successfully!")
        return training_results
    except Exception as e:
        print(f"❌ Error during adversarial training: {str(e)}")
        return None


def example_tactic_evolution(platform):
    """
    Example of autonomous tactic evolution
    """
    if not platform:
        return

    print("\n" + "=" * 60)
    print("EXAMPLE: Autonomous Tactic Evolution")
    print("=" * 60)

    try:
        # Get evolver
        evolver = platform["evolver"]

        # Register a threat actor
        from datetime import datetime

        from adversarial_misinfo_defense.tactic_evolution import TacticType, ThreatActorProfile

        actor_profile = ThreatActorProfile(
            actor_id="example_actor_001",
            name="Example Misinformation Group",
            tactics=[TacticType.SOCIAL_ENGINEERING, TacticType.MEME_MANIPULATION],
            sophistication_level=0.6,
            adaptation_rate=0.4,
            success_history=[0.7, 0.65, 0.72, 0.68],
            last_seen=datetime.now(),
            associated_accounts=["account1", "account2", "account3"],
            geographic_focus=["US", "EU"],
            target_demographics=["young_adults", "politically_active"],
        )

        evolver.register_threat_actor(actor_profile)
        print("✓ Registered threat actor")

        # Run tactic evolution
        print("Running tactic evolution...")
        detection_performance = {
            "tactic_001": 0.85,  # High detection rate means tactic needs to evolve
            "tactic_002": 0.45,  # Lower detection rate means tactic is working well
        }

        evolved_tactics = evolver.evolve_tactics_based_on_detection_rates(detection_performance)
        print(f"✓ Evolved {len(evolved_tactics)} tactics based on detection pressure")

        # Generate report
        report = evolver.get_threat_actor_report("example_actor_001")
        print("✓ Generated threat actor report")

        return report
    except Exception as e:
        print(f"❌ Error during tactic evolution: {str(e)}")
        return None


def main():
    """
    Main example function demonstrating all platform capabilities
    """
    print("ADVERSARIAL MISINFORMATION DEFENSE PLATFORM - EXAMPLE USAGE")
    print("=" * 60)

    # Run all examples
    platform = example_platform_creation()
    example_text_detection(platform)
    example_image_detection(platform)
    example_audio_detection(platform)
    example_validation_benchmark()
    example_red_blue_team_exercises()
    example_adversarial_training(platform)
    example_tactic_evolution(platform)

    print("\n" + "=" * 60)
    print("ALL EXAMPLES COMPLETED")
    print("=" * 60)
    print("\nFor more detailed usage, see the USER_GUIDE.md and API documentation.")


if __name__ == "__main__":
    main()
