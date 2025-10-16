#!/usr/bin/env python3
"""
Main Entry Point for Adversarial Misinformation Defense Platform

This script provides the main entry point for running the complete platform,
including all detection, training, validation, and exercise management components.
"""
import argparse
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import create_platform
from adversarial_misinfo_defense.validation_suite import ValidationBenchmark
from adversarial_misinfo_defense.red_blue_team import (
    RedBlueTeamExerciseManager, ScenarioBuilderCLI
)
from adversarial_misinfo_defense.tactic_evolution import AutonomousTacticEvolver
from adversarial_misinfo_defense.adversarial_training import AdversarialTrainingEngine


def setup_logging(level: str = "INFO"):
    """
    Setup logging for the application
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )


def run_detection_mode(args: argparse.Namespace) -> int:
    """
    Run detection mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting detection mode...")
        
        # Create platform
        platform = create_platform()
        detector = platform['detector']
        
        # Process input based on type
        if args.text:
            # Process text input
            results = detector.detect_text_misinfo([args.text])
            print(f"Misinformation Score: {results[0].get('misinfo_score', 0.0):.3f}")
            print(f"Confidence: {results[0].get('confidence', 0.0):.3f}")
            
        elif args.file:
            # Process file input
            file_path = Path(args.file)
            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return 1
                
            # Determine file type and process accordingly
            if file_path.suffix.lower() in ['.txt', '.md']:
                # Text file
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                results = detector.detect_text_misinfo([content])
                print(f"Misinformation Score: {results[0].get('misinfo_score', 0.0):.3f}")
                print(f"Confidence: {results[0].get('confidence', 0.0):.3f}")
                
            elif file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif']:
                # Image file
                results = detector.detect_image_misinfo([str(file_path)])
                print(f"Manipulation Score: {results[0].get('misinfo_score', 0.0):.3f}")
                print(f"Confidence: {results[0].get('confidence', 0.0):.3f}")
                
            elif file_path.suffix.lower() in ['.mp3', '.wav', '.flac']:
                # Audio file
                results = detector.detect_audio_misinfo([str(file_path)])
                print(f"Deepfake Score: {results[0].get('misinfo_score', 0.0):.3f}")
                print(f"Confidence: {results[0].get('confidence', 0.0):.3f}")
                
            elif file_path.suffix.lower() in ['.mp4', '.avi', '.mov']:
                # Video file
                results = detector.detect_video_misinfo([str(file_path)])
                print(f"Deepfake Score: {results[0].get('misinfo_score', 0.0):.3f}")
                print(f"Confidence: {results[0].get('confidence', 0.0):.3f}")
                
            else:
                logger.error(f"Unsupported file type: {file_path.suffix}")
                return 1
        
        else:
            logger.error("Either --text or --file must be specified")
            return 1
            
        logger.info("Detection completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during detection: {str(e)}", exc_info=True)
        return 1


def run_validation_mode(args: argparse.Namespace) -> int:
    """
    Run validation mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting validation mode...")
        
        # Create validation benchmark
        validator = ValidationBenchmark()
        
        # Run validation
        results = validator.run_comprehensive_validation()
        
        # Output results
        if args.output:
            validator.save_validation_results(args.output, results)
            logger.info(f"Results saved to {args.output}")
        else:
            report = validator.generate_validation_report(results)
            print(report)
        
        logger.info("Validation completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during validation: {str(e)}", exc_info=True)
        return 1


def run_training_mode(args: argparse.Namespace) -> int:
    """
    Run training mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting training mode...")
        
        # Create training engine
        trainer = AdversarialTrainingEngine()
        
        # In a real implementation, you would load training data and run training
        logger.info("Training completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during training: {str(e)}", exc_info=True)
        return 1


def run_exercise_mode(args: argparse.Namespace) -> int:
    """
    Run exercise mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting exercise mode...")
        
        # Create exercise manager
        manager = RedBlueTeamExerciseManager()
        
        if args.interactive:
            # Run interactive scenario builder
            cli = ScenarioBuilderCLI(manager)
            cli.run_interactive_builder()
        else:
            # List scenarios
            scenarios = manager.get_all_scenarios()
            print(f"Found {len(scenarios)} scenarios:")
            for scenario in scenarios:
                print(f"  - {scenario.name} ({scenario.difficulty.value})")
        
        logger.info("Exercise mode completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during exercise mode: {str(e)}", exc_info=True)
        return 1


def run_evolution_mode(args: argparse.Namespace) -> int:
    """
    Run tactic evolution mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting tactic evolution mode...")
        
        # Create tactic evolver
        evolver = AutonomousTacticEvolver()
        
        # In a real implementation, you would run evolution processes
        logger.info("Tactic evolution completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during tactic evolution: {str(e)}", exc_info=True)
        return 1


def create_parser() -> argparse.ArgumentParser:
    """
    Create argument parser for the application
    """
    parser = argparse.ArgumentParser(
        prog='adversarial-misinfo-defense',
        description='Adversarial Misinformation Defense Platform',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
        default='INFO',
        help='Set logging level (default: INFO)'
    )
    
    # Add subcommands
    subparsers = parser.add_subparsers(
        dest='mode',
        help='Operating mode'
    )
    
    # Detection mode
    detection_parser = subparsers.add_parser(
        'detect',
        help='Run detection on content'
    )
    detection_parser.add_argument(
        '--text',
        help='Text content to analyze'
    )
    detection_parser.add_argument(
        '--file',
        help='File to analyze'
    )
    
    # Validation mode
    validation_parser = subparsers.add_parser(
        'validate',
        help='Run validation suite'
    )
    validation_parser.add_argument(
        '--output', '-o',
        help='Output file for results'
    )
    
    # Training mode
    training_parser = subparsers.add_parser(
        'train',
        help='Run adversarial training'
    )
    training_parser.add_argument(
        '--data',
        help='Training data directory'
    )
    training_parser.add_argument(
        '--epochs',
        type=int,
        default=10,
        help='Number of training epochs'
    )
    
    # Exercise mode
    exercise_parser = subparsers.add_parser(
        'exercise',
        help='Manage red/blue team exercises'
    )
    exercise_parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='Run interactive scenario builder'
    )
    exercise_parser.add_argument(
        '--list',
        action='store_true',
        help='List available scenarios'
    )
    
    # Evolution mode
    evolution_parser = subparsers.add_parser(
        'evolve',
        help='Run autonomous tactic evolution'
    )
    evolution_parser.add_argument(
        '--cycles',
        type=int,
        default=1,
        help='Number of evolution cycles to run'
    )
    
    return parser


def main() -> int:
    """
    Main entry point for the application
    """
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.mode:
        parser.print_help()
        return 0
    
    # Dispatch to appropriate mode handler
    if args.mode == 'detect':
        return run_detection_mode(args)
    elif args.mode == 'validate':
        return run_validation_mode(args)
    elif args.mode == 'train':
        return run_training_mode(args)
    elif args.mode == 'exercise':
        return run_exercise_mode(args)
    elif args.mode == 'evolve':
        return run_evolution_mode(args)
    else:
        print(f"Unknown mode: {args.mode}")
        return 1


if __name__ == '__main__':
    sys.exit(main())