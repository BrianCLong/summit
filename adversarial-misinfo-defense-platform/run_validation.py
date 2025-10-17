#!/usr/bin/env python3
"""
Validation Runner for Adversarial Misinformation Defense Platform

This script runs a comprehensive validation of the platform and generates
detailed reports on performance across all modalities.
"""
import sys
import os
import logging
from pathlib import Path
import json
from datetime import datetime
import argparse

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import create_platform
from adversarial_misinfo_defense.validation_suite import ValidationBenchmark
from adversarial_misinfo_defense.red_blue_team import RedBlueTeamExerciseManager


def setup_logging(log_level: str = "INFO"):
    """
    Setup logging for the validation
    """
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("validation.log")
        ]
    )


def run_comprehensive_validation(output_dir: str = "reports") -> int:
    """
    Run comprehensive validation of the platform
    """
    setup_logging()
    logger = logging.getLogger(__name__)
    
    logger.info("Starting comprehensive validation of Adversarial Misinformation Defense Platform")
    
    try:
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Create platform
        logger.info("Creating platform...")
        platform = create_platform()
        detector = platform['detector']
        logger.info("✓ Platform created successfully")
        
        # Run validation benchmark
        logger.info("Running validation benchmark...")
        validator = ValidationBenchmark()
        validation_results = validator.run_comprehensive_validation()
        logger.info("✓ Validation benchmark completed")
        
        # Generate detailed report
        logger.info("Generating validation report...")
        report = validator.generate_validation_report(validation_results)
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save raw results
        results_file = output_path / f"validation_results_{timestamp}.json"
        with open(results_file, 'w') as f:
            json.dump(validation_results, f, indent=2, default=str)
        logger.info(f"✓ Saved raw results to {results_file}")
        
        # Save report
        report_file = output_path / f"validation_report_{timestamp}.md"
        with open(report_file, 'w') as f:
            f.write(report)
        logger.info(f"✓ Saved report to {report_file}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("ADVERSARIAL MISINFORMATION DEFENSE PLATFORM - VALIDATION SUMMARY")
        print("=" * 80)
        
        overall_metrics = validation_results.get('overall_metrics', {})
        print(f"Total Modalities Tested: {overall_metrics.get('total_modalities_tested', 0)}")
        print(f"Average Accuracy: {overall_metrics.get('average_accuracy', 0.0):.3f}")
        print(f"Average Precision: {overall_metrics.get('average_precision', 0.0):.3f}")
        print(f"Average Recall: {overall_metrics.get('average_recall', 0.0):.3f}")
        print(f"Average F1-Score: {overall_metrics.get('average_f1_score', 0.0):.3f}")
        print(f"Average AUC-ROC: {overall_metrics.get('average_auc_roc', 0.0):.3f}")
        
        print("\nModality Performance:")
        modality_results = validation_results.get('modality_results', {})
        for modality, results in modality_results.items():
            if 'performance_metrics' in results and 'error' not in results['performance_metrics']:
                metrics = results['performance_metrics']
                print(f"  {modality.capitalize():<12}: Acc={metrics.get('accuracy', 0.0):.3f}, "
                      f"Pre={metrics.get('precision', 0.0):.3f}, "
                      f"Rec={metrics.get('recall', 0.0):.3f}, "
                      f"F1={metrics.get('f1_score', 0.0):.3f}")
            else:
                print(f"  {modality.capitalize():<12}: Error - {results.get('error', 'Unknown error')}")
        
        print(f"\nDetailed reports saved to:")
        print(f"  - Raw results: {results_file}")
        print(f"  - Report: {report_file}")
        
        print("\n" + "=" * 80)
        print("VALIDATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        
        return 0
        
    except Exception as e:
        logger.error(f"Error during validation: {str(e)}", exc_info=True)
        print(f"\n❌ Validation failed with error: {str(e)}")
        return 1


def run_red_blue_team_demo() -> int:
    """
    Run a demonstration of the red/blue team capabilities
    """
    setup_logging()
    logger = logging.getLogger(__name__)
    
    logger.info("Running red/blue team demonstration...")
    
    try:
        # Create exercise manager
        exercise_manager = RedBlueTeamExerciseManager()
        
        # List scenarios
        scenarios = exercise_manager.get_all_scenarios()
        print(f"\nFound {len(scenarios)} scenarios:")
        for scenario in scenarios:
            print(f"  - {scenario.name} ({scenario.difficulty.value})")
        
        # Create a new scenario if none exist
        if not scenarios:
            print("\nCreating sample scenario...")
            scenario = exercise_manager.create_scenario(
                name="Social Media Influence Campaign",
                description="Simulate a coordinated social media influence operation",
                exercise_type="social_engineering",
                difficulty="intermediate",
                objectives=[
                    "Detect coordinated account behavior patterns",
                    "Identify inauthentic engagement and amplification",
                    "Trace information flow manipulation techniques"
                ],
                created_by="Validation Demo"
            )
            print(f"✓ Created scenario: {scenario.name}")
        
        print("\n✓ Red/blue team demonstration completed successfully")
        return 0
        
    except Exception as e:
        logger.error(f"Error during red/blue team demo: {str(e)}", exc_info=True)
        print(f"\n❌ Red/blue team demo failed with error: {str(e)}")
        return 1


def main():
    """
    Main entry point for validation runner
    """
    parser = argparse.ArgumentParser(
        prog='run_validation',
        description='Run validation of Adversarial Misinformation Defense Platform'
    )
    
    parser.add_argument(
        '--mode',
        choices=['full', 'validation', 'demo'],
        default='full',
        help='Validation mode (default: full)'
    )
    
    parser.add_argument(
        '--output-dir',
        default='reports',
        help='Output directory for reports (default: reports)'
    )
    
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default='INFO',
        help='Logging level (default: INFO)'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.log_level)
    
    # Run appropriate mode
    if args.mode == 'full':
        # Run full validation
        validation_result = run_comprehensive_validation(args.output_dir)
        demo_result = run_red_blue_team_demo()
        return max(validation_result, demo_result)
    elif args.mode == 'validation':
        # Run only validation
        return run_comprehensive_validation(args.output_dir)
    elif args.mode == 'demo':
        # Run only demo
        return run_red_blue_team_demo()
    else:
        print(f"Unknown mode: {args.mode}")
        return 1


if __name__ == '__main__':
    sys.exit(main())