"""
CLI Entry Point for Adversarial Misinformation Defense Platform

This module provides command-line interface access to all platform functionality.
"""

import argparse
import logging
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import create_platform
from adversarial_misinfo_defense.red_blue_team import RedBlueTeamExerciseManager
from adversarial_misinfo_defense.validation_suite import ValidationBenchmark


def setup_logging(level: str = "INFO"):
    """
    Setup logging for CLI
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def create_cli_parser() -> argparse.ArgumentParser:
    """
    Create CLI argument parser
    """
    parser = argparse.ArgumentParser(
        prog="amd-cli",
        description="Adversarial Misinformation Defense Platform CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        default="INFO",
        help="Set logging level (default: INFO)",
    )

    # Add subcommands
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Detect subcommand
    detect_parser = subparsers.add_parser("detect", help="Run detection on content")
    detect_parser.add_argument("--text", nargs="+", help="Text content to analyze")
    detect_parser.add_argument("--image", nargs="+", help="Image files to analyze")
    detect_parser.add_argument("--audio", nargs="+", help="Audio files to analyze")
    detect_parser.add_argument("--video", nargs="+", help="Video files to analyze")
    detect_parser.add_argument("--meme", nargs="+", help="Meme files to analyze")
    detect_parser.add_argument("--deepfake", nargs="+", help="Deepfake media files to analyze")

    # Validate subcommand
    validate_parser = subparsers.add_parser("validate", help="Run validation suite")
    validate_parser.add_argument("--output", "-o", help="Output file for validation results")
    validate_parser.add_argument(
        "--benchmark",
        "-b",
        default="state_of_the_art",
        help="Benchmark to compare against (default: state_of_the_art)",
    )

    # Train subcommand
    train_parser = subparsers.add_parser("train", help="Run adversarial training")
    train_parser.add_argument("--data", "-d", help="Training data directory")
    train_parser.add_argument(
        "--epochs", "-e", type=int, default=100, help="Number of training epochs (default: 100)"
    )
    train_parser.add_argument(
        "--modalities",
        "-m",
        nargs="+",
        default=["text", "image", "audio", "video", "meme", "deepfake"],
        help="Modalities to train (default: all)",
    )

    # Exercise subcommand
    exercise_parser = subparsers.add_parser("exercise", help="Manage red/blue team exercises")
    exercise_parser.add_argument(
        "--interactive", "-i", action="store_true", help="Run interactive scenario builder"
    )
    exercise_parser.add_argument(
        "--list", "-l", action="store_true", help="List available scenarios"
    )
    exercise_parser.add_argument("--run", "-r", help="Run exercise with specified scenario")

    # Evolve subcommand
    evolve_parser = subparsers.add_parser("evolve", help="Run autonomous tactic evolution")
    evolve_parser.add_argument(
        "--cycles", "-c", type=int, default=5, help="Number of evolution cycles to run (default: 5)"
    )
    evolve_parser.add_argument(
        "--actors",
        "-a",
        nargs="+",
        help="Specific threat actors to evolve (if not specified, evolves all)",
    )

    return parser


def run_detection(args: argparse.Namespace, platform: dict) -> int:
    """
    Run detection command
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        detector = platform["detector"]
        results = []

        # Process text samples
        if args.text:
            logger.info(f"Analyzing {len(args.text)} text samples...")
            text_results = detector.detect_text_misinfo(args.text)
            results.extend(text_results)
            logger.info("Text analysis completed")

        # Process image samples
        if args.image:
            logger.info(f"Analyzing {len(args.image)} image samples...")
            image_results = detector.detect_image_misinfo(args.image)
            results.extend(image_results)
            logger.info("Image analysis completed")

        # Process audio samples
        if args.audio:
            logger.info(f"Analyzing {len(args.audio)} audio samples...")
            audio_results = detector.detect_audio_misinfo(args.audio)
            results.extend(audio_results)
            logger.info("Audio analysis completed")

        # Process video samples
        if args.video:
            logger.info(f"Analyzing {len(args.video)} video samples...")
            video_results = detector.detect_video_misinfo(args.video)
            results.extend(video_results)
            logger.info("Video analysis completed")

        # Process meme samples
        if args.meme:
            logger.info(f"Analyzing {len(args.meme)} meme samples...")
            meme_results = detector.detect_meme_misinfo(args.meme)
            results.extend(meme_results)
            logger.info("Meme analysis completed")

        # Process deepfake samples
        if args.deepfake:
            logger.info(f"Analyzing {len(args.deepfake)} deepfake samples...")
            # For deepfakes, we need media types as well
            media_types = ["video"] * len(args.deepfake)  # Default to video
            deepfake_results = detector.detect_deepfake_misinfo(args.deepfake, media_types)
            results.extend(deepfake_results)
            logger.info("Deepfake analysis completed")

        # Output results
        print("\nDetection Results:")
        print("=" * 50)
        for i, result in enumerate(results):
            print(f"\nResult {i+1}:")
            print(f"  Misinfo Score: {result.get('misinfo_score', 0.0):.3f}")
            print(f"  Confidence: {result.get('confidence', 0.0):.3f}")
            print(
                f"  Classification: {'MISINFORMATION' if result.get('is_misinfo', False) else 'LEGITIMATE'}"
            )

        logger.info("Detection completed successfully")
        return 0

    except Exception as e:
        logger.error(f"Error during detection: {str(e)}", exc_info=True)
        return 1


def run_validation(args: argparse.Namespace) -> int:
    """
    Run validation command
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Running validation suite...")

        validator = ValidationBenchmark()
        results = validator.run_comprehensive_validation()

        if args.output:
            validator.save_validation_results(args.output, results)
            logger.info(f"Validation results saved to {args.output}")
        else:
            report = validator.generate_validation_report(results)
            print(report)

        logger.info("Validation completed successfully")
        return 0

    except Exception as e:
        logger.error(f"Error during validation: {str(e)}", exc_info=True)
        return 1


def run_training(args: argparse.Namespace, platform: dict) -> int:
    """
    Run training command
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Running adversarial training...")

        trainer = platform["trainer"]

        # Run training cycle
        training_results = trainer.run_adversarial_training_cycle(
            modalities=args.modalities, epochs_per_gan=args.epochs, samples_per_modality=50
        )

        print("\nTraining Results:")
        print("=" * 50)
        print(f"Cycle ID: {training_results.get('cycle_id', 'N/A')}")
        print(f"Duration: {training_results.get('duration_seconds', 0):.2f} seconds")
        print(f"Completed: {training_results.get('cycle_completed', False)}")

        modality_results = training_results.get("modality_results", {})
        for modality, mod_results in modality_results.items():
            print(f"\n{modality.capitalize()} Training:")
            if "error" in mod_results:
                print(f"  Error: {mod_results['error']}")
            else:
                print(f"  Accuracy: {mod_results.get('final_accuracy', 0.0):.3f}")

        adversarial_samples = training_results.get("adversarial_samples_generated", {})
        total_samples = sum(adversarial_samples.values())
        print(f"\nGenerated {total_samples} adversarial samples")

        logger.info("Training completed successfully")
        return 0

    except Exception as e:
        logger.error(f"Error during training: {str(e)}", exc_info=True)
        return 1


def run_exercise(args: argparse.Namespace) -> int:
    """
    Run exercise command
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Managing red/blue team exercises...")

        manager = RedBlueTeamExerciseManager()

        if args.interactive:
            # Run interactive scenario builder
            from adversarial_misinfo_defense.scenario_builder_ui import ScenarioBuilderCLI

            cli_builder = ScenarioBuilderCLI(manager)
            cli_builder.run_interactive_builder()

        elif args.list:
            # List scenarios
            scenarios = manager.get_all_scenarios()
            print(f"\nFound {len(scenarios)} scenarios:")
            print("=" * 50)
            for scenario in scenarios:
                print(f"- {scenario.name} ({scenario.difficulty.value})")

        elif args.run:
            # Run specific scenario
            print(f"Running exercise with scenario: {args.run}")
            # Implementation would go here

        else:
            # Default: List scenarios
            scenarios = manager.get_all_scenarios()
            print(f"\nFound {len(scenarios)} scenarios:")
            print("=" * 50)
            for scenario in scenarios:
                print(f"- {scenario.name} ({scenario.difficulty.value})")

        logger.info("Exercise management completed successfully")
        return 0

    except Exception as e:
        logger.error(f"Error during exercise management: {str(e)}", exc_info=True)
        return 1


def run_evolution(args: argparse.Namespace, platform: dict) -> int:
    """
    Run evolution command
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Running autonomous tactic evolution...")

        evolver = platform["evolver"]

        # Run evolution cycles
        for cycle in range(args.cycles):
            logger.info(f"Running evolution cycle {cycle + 1}/{args.cycles}")

            # In a real implementation, this would use actual performance data
            # For this demo, we'll use simulated data
            detection_performance = {
                "text": 0.88,
                "image": 0.82,
                "audio": 0.79,
                "video": 0.81,
                "meme": 0.84,
                "deepfake": 0.92,
            }

            evolved_tactics = evolver.evolve_tactics_based_on_detection_rates(detection_performance)
            logger.info(f"Evolved {len(evolved_tactics)} tactics in cycle {cycle + 1}")

        # Output evolution results
        print("\nEvolution Results:")
        print("=" * 50)
        print(f"Completed {args.cycles} evolution cycles")
        print("Tactics have been autonomously evolved based on detection performance")

        logger.info("Evolution completed successfully")
        return 0

    except Exception as e:
        logger.error(f"Error during evolution: {str(e)}", exc_info=True)
        return 1


def main() -> int:
    """
    Main CLI entry point
    """
    parser = create_cli_parser()
    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level)

    # If no command specified, show help
    if not args.command:
        parser.print_help()
        return 0

    # Create platform for commands that need it
    platform = None
    if args.command in ["detect", "train", "evolve"]:
        platform = create_platform()

    # Dispatch to appropriate command handler
    if args.command == "detect":
        return run_detection(args, platform)
    elif args.command == "validate":
        return run_validation(args)
    elif args.command == "train":
        return run_training(args, platform)
    elif args.command == "exercise":
        return run_exercise(args)
    elif args.command == "evolve":
        return run_evolution(args, platform)
    else:
        print(f"Unknown command: {args.command}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
