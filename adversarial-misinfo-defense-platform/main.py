#!/usr/bin/env python3
"""
Main Entry Point for Adversarial Misinformation Defense Platform

This script provides the main entry point for running the complete platform,
including all detection, training, validation, and exercise management components.
"""
import sys
import argparse
import logging
from pathlib import Path
from typing import Dict, Any

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import create_platform
from adversarial_misinfo_defense.validation_suite import ValidationBenchmark
from adversarial_misinfo_defense.red_blue_team import RedBlueTeamExerciseManager
from adversarial_misinfo_defense.adversarial_training import AdversarialTrainingEngine
from adversarial_misinfo_defense.tactic_evolution import AutonomousTacticEvolver


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
    
    # Detect mode
    detect_parser = subparsers.add_parser(
        'detect',
        help='Run detection on content'
    )
    detect_parser.add_argument(
        '--text',
        nargs='+',
        help='Text content to analyze'
    )
    detect_parser.add_argument(
        '--image',
        nargs='+',
        help='Image files to analyze'
    )
    detect_parser.add_argument(
        '--audio',
        nargs='+',
        help='Audio files to analyze'
    )
    detect_parser.add_argument(
        '--video',
        nargs='+',
        help='Video files to analyze'
    )
    detect_parser.add_argument(
        '--meme',
        nargs='+',
        help='Meme files to analyze'
    )
    detect_parser.add_argument(
        '--deepfake',
        nargs='+',
        help='Deepfake media files to analyze'
    )
    
    # Validate mode
    validate_parser = subparsers.add_parser(
        'validate',
        help='Run validation suite'
    )
    validate_parser.add_argument(
        '--output',
        '-o',
        help='Output file for validation results'
    )
    validate_parser.add_argument(
        '--benchmark',
        '-b',
        default='state_of_the_art',
        help='Benchmark to compare against'
    )
    
    # Train mode
    train_parser = subparsers.add_parser(
        'train',
        help='Run adversarial training'
    )
    train_parser.add_argument(
        '--data',
        '-d',
        help='Training data directory'
    )
    train_parser.add_argument(
        '--epochs',
        '-e',
        type=int,
        default=10,
        help='Number of training epochs'
    )
    train_parser.add_argument(
        '--modalities',
        '-m',
        nargs='+',
        default=['text', 'image', 'audio', 'video', 'meme', 'deepfake'],
        help='Modalities to train'
    )
    
    # Exercise mode
    exercise_parser = subparsers.add_parser(
        'exercise',
        help='Manage red/blue team exercises'
    )
    exercise_parser.add_argument(
        '--interactive',
        '-i',
        action='store_true',
        help='Run interactive scenario builder'
    )
    exercise_parser.add_argument(
        '--list',
        '-l',
        action='store_true',
        help='List available scenarios'
    )
    exercise_parser.add_argument(
        '--run',
        '-r',
        help='Run exercise with specified scenario'
    )
    
    # Evolve mode
    evolve_parser = subparsers.add_parser(
        'evolve',
        help='Run autonomous tactic evolution'
    )
    evolve_parser.add_argument(
        '--cycles',
        '-c',
        type=int,
        default=1,
        help='Number of evolution cycles to run'
    )
    evolve_parser.add_argument(
        '--actors',
        '-a',
        nargs='+',
        help='Specific threat actors to evolve'
    )
    
    return parser


def run_detection_mode(args: argparse.Namespace, platform: Dict[str, Any]) -> int:
    """
    Run detection mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting detection mode...")
        
        detector = platform['detector']
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
            deepfake_results = detector.detect_deepfake_misinfo(args.deepfake, ['video'] * len(args.deepfake))
            results.extend(deepfake_results)
            logger.info("Deepfake analysis completed")
        
        # Output results
        print("\nDetection Results:")
        print("=" * 50)
        for i, result in enumerate(results):
            misinfo_score = result.get('misinfo_score', 0.5)
            confidence = result.get('confidence', 0.5)
            is_misinfo = result.get('is_misinfo', False)
            
            print(f"\nResult {i+1}:")
            print(f"  Misinfo Score: {misinfo_score:.3f}")
            print(f"  Confidence: {confidence:.3f}")
            print(f"  Classification: {'MISINFORMATION' if is_misinfo else 'LEGITIMATE'}")
            
            if 'error' in result:
                print(f"  Error: {result['error']}")
        
        logger.info("Detection mode completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during detection: {str(e)}", exc_info=True)
        return 1


def run_validation_mode(args: argparse.Namespace, platform: Dict[str, Any]) -> int:
    """
    Run validation mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting validation mode...")
        
        validator = ValidationBenchmark()
        
        # Run comprehensive validation
        results = validator.run_comprehensive_validation()
        
        # Generate report
        report = validator.generate_validation_report(results)
        
        # Output results
        if args.output:
            validator.save_validation_results(args.output, results)
            logger.info(f"Validation results saved to {args.output}")
        else:
            print(report)
        
        logger.info("Validation mode completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during validation: {str(e)}", exc_info=True)
        return 1


def run_training_mode(args: argparse.Namespace, platform: Dict[str, Any]) -> int:
    """
    Run training mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting training mode...")
        
        trainer = AdversarialTrainingEngine()
        
        # Run adversarial training cycle
        if args.data:
            # Load training data from directory
            training_data = load_training_data(args.data)
            results = trainer.run_adversarial_training_cycle(
                modalities=args.modalities,
                epochs_per_gan=args.epochs,
                target_concepts=training_data.get('concepts', [])
            )
        else:
            # Run with default parameters
            results = trainer.run_adversarial_training_cycle(
                modalities=args.modalities,
                epochs_per_gan=args.epochs
            )
        
        # Output results
        print("\nTraining Results:")
        print("=" * 50)
        print(f"Cycle ID: {results.get('cycle_id', 'N/A')}")
        print(f"Duration: {results.get('duration_seconds', 0):.2f} seconds")
        print(f"Completed: {results.get('cycle_completed', False)}")
        
        modality_results = results.get('modality_results', {})
        for modality, mod_results in modality_results.items():
            print(f"\n{modality.capitalize()} Training:")
            if 'error' in mod_results:
                print(f"  Error: {mod_results['error']}")
            else:
                print(f"  Accuracy: {mod_results.get('final_accuracy', 0.0):.3f}")
        
        adversarial_samples = results.get('adversarial_samples_generated', {})
        total_samples = sum(adversarial_samples.values())
        print(f"\nGenerated {total_samples} adversarial samples")
        
        logger.info("Training mode completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during training: {str(e)}", exc_info=True)
        return 1


def run_exercise_mode(args: argparse.Namespace, platform: Dict[str, Any]) -> int:
    """
    Run exercise mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting exercise mode...")
        
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
        
        logger.info("Exercise mode completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during exercise mode: {str(e)}", exc_info=True)
        return 1


def run_evolution_mode(args: argparse.Namespace, platform: Dict[str, Any]) -> int:
    """
    Run evolution mode of the platform
    """
    setup_logging(args.log_level)
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting evolution mode...")
        
        evolver = AutonomousTacticEvolver()
        
        # Run evolution cycles
        for cycle in range(args.cycles):
            logger.info(f"Running evolution cycle {cycle + 1}/{args.cycles}")
            
            # In a real implementation, this would use actual performance data
            # For this demo, we'll use simulated data
            detection_performance = {
                'text': 0.88,
                'image': 0.82,
                'audio': 0.79,
                'video': 0.81,
                'meme': 0.84,
                'deepfake': 0.92
            }
            
            evolved_tactics = evolver.evolve_tactics_based_on_detection_rates(detection_performance)
            logger.info(f"Evolved {len(evolved_tactics)} tactics in cycle {cycle + 1}")
        
        # Output evolution results
        print("\nEvolution Results:")
        print("=" * 50)
        print(f"Completed {args.cycles} evolution cycles")
        print("Tactics have been autonomously evolved based on detection performance")
        
        logger.info("Evolution mode completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during evolution: {str(e)}", exc_info=True)
        return 1


def load_training_data(data_dir: str) -> Dict[str, Any]:
    """
    Load training data from directory
    """
    # In a real implementation, this would load actual training data
    # For this demo, we'll return simulated data
    return {
        'concepts': [
            'clickbait',
            'conspiracy_theory',
            'emotional_manipulation',
            'false_authority',
            'inconsistent_narrative'
        ],
        'samples': {
            'text': ['sample_text_1', 'sample_text_2'],
            'image': ['sample_image_1.jpg', 'sample_image_2.png'],
            'audio': ['sample_audio_1.wav'],
            'video': ['sample_video_1.mp4'],
            'meme': ['sample_meme_1.jpg'],
            'deepfake': ['sample_deepfake_1.mp4']
        }
    }


def main() -> int:
    """
    Main entry point for the application
    """
    parser = create_parser()
    args = parser.parse_args()
    
    # Create platform
    platform = create_platform()
    
    # If no mode specified, show help
    if not args.mode:
        parser.print_help()
        return 0
    
    # Dispatch to appropriate mode handler
    if args.mode == 'detect':
        return run_detection_mode(args, platform)
    elif args.mode == 'validate':
        return run_validation_mode(args, platform)
    elif args.mode == 'train':
        return run_training_mode(args, platform)
    elif args.mode == 'exercise':
        return run_exercise_mode(args, platform)
    elif args.mode == 'evolve':
        return run_evolution_mode(args, platform)
    else:
        print(f"Unknown mode: {args.mode}")
        return 1


if __name__ == '__main__':
    sys.exit(main())