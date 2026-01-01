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
from datetime import datetime

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
        help="Set the logging level",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Detection command
    detect_parser = subparsers.add_parser("detect", help="Run detection on content")
    detect_parser.add_argument("--text", type=str, help="Text to analyze for misinformation")
    detect_parser.add_argument("--image", type=str, help="Path to image file for analysis")
    detect_parser.add_argument("--audio", type=str, help="Path to audio file for analysis")
    detect_parser.add_argument("--video", type=str, help="Path to video file for analysis")
    detect_parser.add_argument("--meme", type=str, help="Path to meme file for analysis")

    # Validation command
    validate_parser = subparsers.add_parser("validate", help="Run validation suite")
    validate_parser.add_argument("--output", type=str, help="Output path for validation results")
    validate_parser.add_argument("--benchmark", action="store_true", help="Run benchmark tests")

    # Exercise command
    exercise_parser = subparsers.add_parser("exercise", help="Manage red/blue team exercises")
    exercise_parser.add_argument("--interactive", action="store_true", help="Run interactive exercise mode")
    exercise_parser.add_argument("--scenario", type=str, help="Path to scenario file")

    # Training command
    train_parser = subparsers.add_parser("train", help="Run adversarial training")
    train_parser.add_argument("--data", type=str, required=True, help="Path to training data")
    train_parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs")

    # Evolution command
    evolve_parser = subparsers.add_parser("evolve", help="Run autonomous tactic evolution")
    evolve_parser.add_argument("--cycles", type=int, default=5, help="Number of evolution cycles")

    # Security audit command
    security_parser = subparsers.add_parser("security-audit", help="Perform security audit")
    security_parser.add_argument("--output", type=str, help="Output path for security report")

    # Performance optimization command
    optimize_parser = subparsers.add_parser("optimize", help="Optimize platform performance")

    # Test command
    test_parser = subparsers.add_parser("test", help="Run advanced tests")
    test_parser.add_argument("--component", type=str, help="Test specific component",
                             choices=["text", "image", "audio", "video", "meme", "all"])
    test_parser.add_argument("--output", type=str, help="Output path for test results")

    # Integration command
    integration_parser = subparsers.add_parser("integrate", help="Platform integration with Summit")
    integration_parser.add_argument("--api-url", type=str, help="Summit API base URL")
    integration_parser.add_argument("--auth-token", type=str, help="Authentication token for Summit API")
    integration_parser.add_argument("--action", type=str,
                                   choices=["register", "test", "analyze"],
                                   default="test",
                                   help="Integration action to perform")
    integration_parser.add_argument("--content", type=str, help="Content to analyze for integration test")

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


def run_security_audit(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run security audit on the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting security audit...")

        # Perform security audit
        results = perform_security_audit()

        if args.output:
            import json
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Security audit report saved to {args.output}")
        else:
            print(json.dumps(results, indent=2, default=str))
            logger.info("Security audit completed and report displayed")

        return 0

    except Exception as e:
        logger.error(f"Error during security audit: {str(e)}", exc_info=True)
        return 1


def run_optimization(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run performance optimization
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting performance optimization...")

        # Apply performance optimizations
        results = optimize_platform_performance()

        print(json.dumps(results, indent=2, default=str))
        logger.info("Performance optimization completed")

        return 0

    except Exception as e:
        logger.error(f"Error during optimization: {str(e)}", exc_info=True)
        return 1


def run_tests(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run advanced tests on the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting advanced tests...")

        if args.component == "all" or args.component is None:
            # Run comprehensive test suite
            results = run_advanced_tests()
        else:
            # Run specific component test (would require more detailed implementation)
            tester = ComponentTester()
            if args.component == "text":
                # Example test cases (in practice these would be more comprehensive)
                test_cases = [
                    {"text": "This is a normal sentence.", "expected_label": "benign"},
                    {"text": "This is definitely fake news!", "expected_label": "malicious"}
                ]
                results = tester.test_text_detector(test_cases)
            elif args.component == "image":
                # Run image detector tests
                results = tester.test_image_detector([
                    {"image_path": "/fake/path/normal.jpg", "expected_label": "original"},
                    {"image_path": "/fake/path/edited.jpg", "expected_label": "manipulated"}
                ])
            else:
                logger.error(f"Component {args.component} not implemented in CLI")
                return 1

        if args.output:
            import json
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Test results saved to {args.output}")
        else:
            print(json.dumps(results, indent=2, default=str))
            logger.info("Tests completed and results displayed")

        return 0

    except Exception as e:
        logger.error(f"Error during testing: {str(e)}", exc_info=True)
        return 1


def run_integration(args: argparse.Namespace, platform: dict[str, Any]) -> int:
    """
    Run integration with Summit platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)

    try:
        logger.info("Starting Summit integration...")

        # Create integration instance
        integration = create_summit_integration(
            api_base_url=args.api_url or "http://localhost:8080/api",
            auth_token=args.auth_token
        )

        if args.action == "register":
            # Register platform with Summit
            result = integration.register_platform_with_summit()
            print(json.dumps(result, indent=2, default=str))
            logger.info("Platform registration completed")

        elif args.action == "test":
            # Test connection to Summit
            is_connected = integration.connect_to_summit_services()
            result = {
                "connection_status": "connected" if is_connected else "failed",
                "api_url": integration.summit_api_base_url,
                "timestamp": datetime.now().isoformat()
            }
            print(json.dumps(result, indent=2, default=str))
            logger.info("Connection test completed")

        elif args.action == "analyze":
            # Analyze content with Summit integration
            if args.content:
                content = {"text": args.content}
                context = {}  # Would typically come from Summit
                result = integration.analyze_content_with_summit_context(content, context)

                # Send results to Summit
                summit_response = integration.send_detection_results_to_summit(result)
                result["summit_response"] = summit_response

                print(json.dumps(result, indent=2, default=str))
                logger.info("Content analysis with Summit integration completed")
            else:
                logger.error("--content argument required for analyze action")
                return 1

        else:
            logger.error(f"Unknown integration action: {args.action}")
            return 1

        return 0

    except Exception as e:
        logger.error(f"Error during integration: {str(e)}", exc_info=True)
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
    elif args.command == "security-audit":
        return run_security_audit(args, platform)
    elif args.command == "optimize":
        return run_optimization(args, platform)
    elif args.command == "test":
        return run_tests(args, platform)
    elif args.command == "integrate":
        return run_integration(args, platform)
    else:
        print(f"Unknown command: {args.command}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
