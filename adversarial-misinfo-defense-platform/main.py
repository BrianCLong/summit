#!/usr/bin/env python3
"""
Main Entry Point for Adversarial Misinformation Defense Platform

This script provides the main entry point for running the complete platform,
including all detection, training, validation, and exercise management components.
"""
import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import create_platform
from adversarial_misinfo_defense.adversarial_training import AdversarialTrainingEngine
from adversarial_misinfo_defense.red_blue_team import RedBlueTeamExerciseManager
from adversarial_misinfo_defense.tactic_evolution import AutonomousTacticEvolver
from adversarial_misinfo_defense.validation_suite import ValidationBenchmark


def setup_logging(level: str = "INFO"):
    """
    Setup logging for the application
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def create_parser() -> argparse.ArgumentParser:
    """
    Create argument parser for the application
    """
    parser = argparse.ArgumentParser(
        prog="amd-platform",
        description="Adversarial Misinformation Defense Platform",
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
    detect_parser.add_argument("--text", help="Text content to analyze")
    detect_parser.add_argument("--file", help="File to analyze")

    # Validate subcommand
    validate_parser = subparsers.add_parser("validate", help="Run validation suite")
    validate_parser.add_argument(
        "--output", "-o", help="Output file for validation results (JSON format)"
    )
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

    # Exercise subcommand
    exercise_parser = subparsers.add_parser("exercise", help="Manage red/blue team exercises")
    exercise_parser.add_argument(
        "--interactive", "-i", action="store_true", help="Run interactive scenario builder"
    )
    exercise_parser.add_argument(
        "--list", "-l", action="store_true", help="List available scenarios"
    )

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


def run_detection(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run detection on provided content
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting detection...")

        detector = platform["detector"]

        if args.text:
            # Analyze text
            results = detector.detect_text_misinfo([args.text])
            print(json.dumps(results[0], indent=2, default=str))
            logger.info("Text detection completed")

        elif args.file:
            # Analyze file (determine type from extension)
            file_path = Path(args.file)
            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return 1

            # Determine file type
            suffix = file_path.suffix.lower()

            if suffix in [".txt", ".md"]:
                # Text file
                with open(file_path, encoding="utf-8") as f:
                    content = f.read()
                results = detector.detect_text_misinfo([content])
                print(json.dumps(results[0], indent=2, default=str))
                logger.info("Text file detection completed")

            elif suffix in [".jpg", ".jpeg", ".png", ".gif"]:
                # Image file
                results = detector.detect_image_misinfo([str(file_path)])
                print(json.dumps(results[0], indent=2, default=str))
                logger.info("Image file detection completed")

            elif suffix in [".mp3", ".wav", ".flac"]:
                # Audio file
                results = detector.detect_audio_misinfo([str(file_path)])
                print(json.dumps(results[0], indent=2, default=str))
                logger.info("Audio file detection completed")

            elif suffix in [".mp4", ".avi", ".mov"]:
                # Video file
                results = detector.detect_video_misinfo([str(file_path)])
                print(json.dumps(results[0], indent=2, default=str))
                logger.info("Video file detection completed")

            else:
                logger.error(f"Unsupported file type: {suffix}")
                return 1

        else:
            logger.error("Either --text or --file must be specified")
            return 1

        return 0

    except Exception as e:
        logger.error(f"Error during detection: {str(e)}", exc_info=True)
        return 1


def run_validation(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run validation suite
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting validation...")

        validator = ValidationBenchmark()
        results = validator.run_comprehensive_validation()

        if args.output:
            validator.save_validation_results(args.output, results)
            logger.info(f"Validation results saved to {args.output}")
        else:
            report = validator.generate_validation_report(results)
            print(report)
            logger.info("Validation completed and report displayed")

        return 0

    except Exception as e:
        logger.error(f"Error during validation: {str(e)}", exc_info=True)
        return 1


def run_training(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run adversarial training
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting adversarial training...")

        trainer = AdversarialTrainingEngine()

        if args.data:
            # Load training data from directory
            data_dir = Path(args.data)
            if not data_dir.exists():
                logger.error(f"Training data directory not found: {data_dir}")
                return 1

            logger.info(f"Loading training data from {data_dir}")
            # In a real implementation, you would load actual training data

        # Run training cycles
        training_results = trainer.run_adversarial_training_cycle(epochs_per_gan=args.epochs)

        logger.info("Adversarial training completed")
        print(json.dumps(training_results, indent=2, default=str))
        return 0

    except Exception as e:
        logger.error(f"Error during training: {str(e)}", exc_info=True)
        return 1


def run_exercise(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run red/blue team exercises
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting red/blue team exercises...")

        manager = RedBlueTeamExerciseManager()

        if args.interactive:
            # Run interactive scenario builder
            from adversarial_misinfo_defense.scenario_builder_ui import ScenarioBuilderCLI

            cli_builder = ScenarioBuilderCLI(manager)
            cli_builder.run_interactive_builder()

        elif args.list:
            # List scenarios
            scenarios = manager.get_all_scenarios()
            print(f"Found {len(scenarios)} scenarios:")
            for scenario in scenarios:
                print(f"  - {scenario.name} ({scenario.difficulty.value})")

        else:
            # Default: List scenarios
            scenarios = manager.get_all_scenarios()
            print(f"Found {len(scenarios)} scenarios:")
            for scenario in scenarios:
                print(f"  - {scenario.name} ({scenario.difficulty.value})")

        logger.info("Red/blue team exercises completed")
        return 0

    except Exception as e:
        logger.error(f"Error during exercises: {str(e)}", exc_info=True)
        return 1


def run_evolution(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run autonomous tactic evolution
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting autonomous tactic evolution...")

        evolver = AutonomousTacticEvolver()

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

        logger.info("Autonomous tactic evolution completed")
        print(f"Completed {args.cycles} evolution cycles")
        return 0

    except Exception as e:
        logger.error(f"Error during evolution: {str(e)}", exc_info=True)
        return 1


def main() -> int:
    """
    Main entry point for the application
    """
    parser = create_parser()
    args = parser.parse_args()

    # If no command specified, show help
    if not args.command:
        parser.print_help()
        return 0

    # Create the platform
    platform = create_platform()

    # Dispatch to appropriate command handler
    if args.command == "detect":
        return run_detection(args, platform)
    elif args.command == "validate":
        return run_validation(args, platform)
    elif args.command == "train":
        return run_training(args, platform)
    elif args.command == "exercise":
        return run_exercise(args, platform)
    elif args.command == "evolve":
        return run_evolution(args, platform)
    else:
        print(f"Unknown command: {args.command}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
