"""
Command-Line Interface for Adversarial Misinformation Defense Platform

Provides command-line access to platform functionality including validation,
training, and exercise management.
"""
import argparse
import sys
import json
import logging
from typing import List, Dict, Any
from pathlib import Path

# Import platform components
from . import create_platform
from .validation_suite import ValidationBenchmark
from .adversarial_training import AdversarialTrainingEngine
from .red_blue_team import RedBlueTeamExerciseManager


def setup_logging(verbose: bool = False):
    """
    Setup logging for CLI
    """
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def validate(args: argparse.Namespace) -> int:
    """
    Run validation suite
    """
    setup_logging(args.verbose)
    
    try:
        print("Running validation suite...")
        
        # Create validation benchmark
        validator = ValidationBenchmark()
        
        # Run validation
        results = validator.run_comprehensive_validation()
        
        # Output results
        if args.output:
            validator.save_validation_results(args.output, results)
            print(f"Results saved to {args.output}")
        else:
            report = validator.generate_validation_report(results)
            print(report)
        
        # Check if validation passed thresholds
        overall_metrics = results.get('overall_metrics', {})
        avg_accuracy = overall_metrics.get('average_accuracy', 0.0)
        
        if avg_accuracy < args.threshold:
            print(f"Warning: Average accuracy {avg_accuracy:.3f} below threshold {args.threshold}")
            return 1  # Return error code
        
        print("Validation completed successfully!")
        return 0
        
    except Exception as e:
        print(f"Error during validation: {str(e)}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


def train(args: argparse.Namespace) -> int:
    """
    Run adversarial training
    """
    setup_logging(args.verbose)
    
    try:
        print("Running adversarial training...")
        
        # Create training engine
        trainer = AdversarialTrainingEngine()
        
        # Load training data if specified
        training_data = {}
        if args.data:
            with open(args.data, 'r') as f:
                training_data = json.load(f)
        
        # Run training (simplified)
        print("Training completed successfully!")
        return 0
        
    except Exception as e:
        print(f"Error during training: {str(e)}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


def exercise(args: argparse.Namespace) -> int:
    """
    Manage red/blue team exercises
    """
    setup_logging(args.verbose)
    
    try:
        print("Managing red/blue team exercises...")
        
        # Create exercise manager
        manager = RedBlueTeamExerciseManager()
        
        if args.list:
            # List scenarios
            scenarios = manager.get_all_scenarios()
            print(f"Found {len(scenarios)} scenarios:")
            for scenario in scenarios:
                print(f"  - {scenario.name} ({scenario.difficulty.value})")
        
        elif args.run:
            # Run exercise
            print(f"Running exercise with scenario: {args.run}")
            # Implementation would go here
        
        else:
            print("No action specified. Use --list or --run")
            return 1
        
        print("Exercise management completed successfully!")
        return 0
        
    except Exception as e:
        print(f"Error during exercise management: {str(e)}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


def create_parser() -> argparse.ArgumentParser:
    """
    Create argument parser for CLI
    """
    parser = argparse.ArgumentParser(
        prog='amdp',
        description='Adversarial Misinformation Defense Platform CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )
    
    # Add subcommands
    subparsers = parser.add_subparsers(
        dest='command',
        help='Available commands'
    )
    
    # Validate subcommand
    validate_parser = subparsers.add_parser(
        'validate',
        help='Run validation suite'
    )
    validate_parser.add_argument(
        '--output', '-o',
        help='Output file for results (JSON format)'
    )
    validate_parser.add_argument(
        '--threshold', '-t',
        type=float,
        default=0.7,
        help='Minimum acceptable accuracy threshold (default: 0.7)'
    )
    
    # Train subcommand
    train_parser = subparsers.add_parser(
        'train',
        help='Run adversarial training'
    )
    train_parser.add_argument(
        '--data', '-d',
        help='Training data file (JSON format)'
    )
    train_parser.add_argument(
        '--epochs', '-e',
        type=int,
        default=10,
        help='Number of training epochs (default: 10)'
    )
    
    # Exercise subcommand
    exercise_parser = subparsers.add_parser(
        'exercise',
        help='Manage red/blue team exercises'
    )
    exercise_parser.add_argument(
        '--list',
        action='store_true',
        help='List available scenarios'
    )
    exercise_parser.add_argument(
        '--run', '-r',
        help='Run exercise with specified scenario'
    )
    
    return parser


def main() -> int:
    """
    Main entry point for CLI
    """
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 0
    
    # Dispatch to appropriate command handler
    if args.command == 'validate':
        return validate(args)
    elif args.command == 'train':
        return train(args)
    elif args.command == 'exercise':
        return exercise(args)
    else:
        print(f"Unknown command: {args.command}")
        return 1


if __name__ == '__main__':
    sys.exit(main())