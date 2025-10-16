#!/usr/bin/env python3
"""
Setup Script for Adversarial Misinformation Defense Platform

This script sets up the platform environment, downloads required models,
and prepares the system for operation.
"""
import sys
import os
import logging
from pathlib import Path
import subprocess
import argparse
import json
from typing import List, Dict, Any
import shutil


def setup_logging(log_level: str = "INFO"):
    """
    Setup logging for the setup process
    """
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )


def check_python_version():
    """
    Check that Python version meets requirements
    """
    import sys
    if sys.version_info < (3, 8):
        raise RuntimeError("Python 3.8 or higher is required")
    print(f"✓ Python version {sys.version} is supported")


def install_dependencies(requirements_file: str = "requirements.txt"):
    """
    Install required dependencies using pip
    """
    print("Installing dependencies...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", requirements_file
        ])
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {str(e)}")
        return False


def download_pretrained_models(models_dir: str = "models"):
    """
    Download pretrained models required by the platform
    """
    print("Downloading pretrained models...")
    
    # Create models directory
    models_path = Path(models_dir)
    models_path.mkdir(exist_ok=True)
    
    # In a real implementation, you would download actual models here
    # For this example, we'll just create placeholder files
    model_placeholders = [
        "text_classifier.pth",
        "image_detector.onnx",
        "audio_analyzer.pkl",
        "video_processor.h5",
        "meme_analyzer.joblib",
        "deepfake_detector.pt"
    ]
    
    for model_file in model_placeholders:
        model_path = models_path / model_file
        if not model_path.exists():
            # Create a simple placeholder file
            model_path.write_text(f"# Placeholder for {model_file}\n# This would be a real model in production\n")
            print(f"  Created placeholder: {model_file}")
    
    print("✓ Pretrained models downloaded (placeholders created)")
    return True


def setup_directories(data_dir: str = "data", logs_dir: str = "logs"):
    """
    Setup required directories
    """
    print("Setting up directories...")
    
    directories = [data_dir, logs_dir, "models", "reports", "scenarios"]
    
    for directory in directories:
        dir_path = Path(directory)
        dir_path.mkdir(exist_ok=True)
        print(f"  Created directory: {directory}")
    
    print("✓ Directories setup successfully")
    return True


def create_sample_configuration(config_file: str = "config.json"):
    """
    Create sample configuration file
    """
    print("Creating sample configuration...")
    
    sample_config = {
        "platform": {
            "name": "Adversarial Misinformation Defense Platform",
            "version": "1.0.0",
            "environment": "development"
        },
        "detection": {
            "thresholds": {
                "default": 0.5,
                "high_confidence": 0.8,
                "low_confidence": 0.3
            },
            "models": {
                "text": "distilbert-base-uncased-finetuned-sst-2-english",
                "image": "efficientnet-b0",
                "audio": "vggish",
                "video": "slowfast",
                "meme": "resnet50",
                "deepfake": "xception"
            }
        },
        "training": {
            "batch_size": 32,
            "epochs": 10,
            "learning_rate": 0.001,
            "adversarial": {
                "enabled": True,
                "sample_ratio": 0.2
            }
        },
        "logging": {
            "level": "INFO",
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        },
        "performance": {
            "max_workers": 4,
            "cache_size": 1000,
            "timeout_seconds": 300
        },
        "security": {
            "enable_sandboxing": True,
            "content_filter_enabled": True
        },
        "database": {
            "url": "sqlite:///adversarial_misinfo.db"
        },
        "api": {
            "host": "localhost",
            "port": 8000,
            "debug": False
        },
        "validation": {
            "benchmark": "state_of_the_art",
            "threshold": 0.8
        },
        "exercise": {
            "default_duration": 60,
            "auto_save": True
        }
    }
    
    config_path = Path(config_file)
    with open(config_path, 'w') as f:
        json.dump(sample_config, f, indent=2)
    
    print(f"✓ Sample configuration created: {config_file}")
    return True


def run_initial_tests():
    """
    Run initial tests to verify platform functionality
    """
    print("Running initial tests...")
    
    try:
        # Import platform components
        from adversarial_misinfo_defense import create_platform
        from adversarial_misinfo_defense.validation_suite import ValidationBenchmark
        from adversarial_misinfo_defense.red_blue_team import RedBlueTeamExerciseManager
        
        # Test platform creation
        platform = create_platform()
        print("✓ Platform creation test passed")
        
        # Test detector component
        detector = platform['detector']
        print("✓ Detector component test passed")
        
        # Test validation benchmark
        validator = ValidationBenchmark()
        print("✓ Validation benchmark test passed")
        
        # Test red/blue team exercise manager
        manager = RedBlueTeamExerciseManager()
        print("✓ Red/blue team exercise manager test passed")
        
        print("✓ All initial tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Initial tests failed: {str(e)}")
        return False


def create_sample_data(data_dir: str = "data"):
    """
    Create sample data for testing and demonstration
    """
    print("Creating sample data...")
    
    data_path = Path(data_dir)
    
    # Create sample text files
    sample_texts = [
        "This shocking revelation will change everything you thought you knew!",
        "Scientists have confirmed that this ONE WEIRD TRICK works!",
        "BREAKING: Government conspiracy exposed by anonymous whistleblower",
        "You won't believe what happened next - banned by Big Tech",
        "The truth about climate change that they don't want you to know",
        "This is just a normal, factual statement about everyday topics.",
        "Research shows that balanced diets and regular exercise are beneficial.",
        "According to peer-reviewed studies, vaccination has saved millions of lives.",
        "Historical analysis reveals complex factors in geopolitical events.",
        "Economic data indicates mixed trends in various market sectors."
    ]
    
    # Save sample texts
    (data_path / "sample_texts.txt").write_text("\n".join(sample_texts))
    print("  Created sample text data")
    
    # Create sample scenarios
    scenario_dir = data_path / "scenarios"
    scenario_dir.mkdir(exist_ok=True)
    
    sample_scenarios = [
        {
            "name": "Basic Social Engineering Test",
            "description": "Test defenses against basic social engineering tactics",
            "type": "social_engineering",
            "difficulty": "beginner",
            "objectives": [
                "Identify phishing attempts in email communications",
                "Recognize manipulation tactics in social interactions",
                "Report suspicious activities appropriately"
            ]
        },
        {
            "name": "Intermediate Meme Campaign Simulation",
            "description": "Simulate a coordinated meme-based misinformation campaign",
            "type": "meme_campaign",
            "difficulty": "intermediate",
            "objectives": [
                "Detect coordinated meme distribution patterns",
                "Identify manipulated content and false narratives",
                "Track source origins and amplification networks"
            ]
        }
    ]
    
    for i, scenario in enumerate(sample_scenarios, 1):
        scenario_file = scenario_dir / f"sample_scenario_{i:02d}.json"
        with open(scenario_file, 'w') as f:
            json.dump(scenario, f, indent=2)
    
    print("  Created sample scenarios")
    print("✓ Sample data created successfully")
    return True


def display_completion_message():
    """
    Display completion message with usage instructions
    """
    print("\n" + "=" * 80)
    print("ADVERSARIAL MISINFORMATION DEFENSE PLATFORM SETUP COMPLETE")
    print("=" * 80)
    print("\nPlatform is now ready for use!")
    print("\nQuick Start Commands:")
    print("  python run_validation.py --mode full              # Run full validation")
    print("  python run_validation.py --mode validation        # Run validation only")
    print("  python run_validation.py --mode demo              # Run demo exercises")
    print("  python main.py detect --text \"Sample text\"        # Analyze text")
    print("  python main.py validate                           # Run validation suite")
    print("  python main.py exercise --interactive             # Start scenario builder")
    print("\nDirectories Created:")
    print("  data/       - Sample data and scenarios")
    print("  models/     - Pretrained model placeholders")
    print("  logs/       - Log files")
    print("  reports/    - Validation reports")
    print("  scenarios/  - Exercise scenarios")
    print("\nConfiguration Files:")
    print("  config.json - Platform configuration")
    print("  requirements.txt - Dependencies")
    print("\nFor detailed usage instructions, see USER_GUIDE.md")
    print("=" * 80)


def main():
    """
    Main setup function
    """
    parser = argparse.ArgumentParser(
        prog='setup_platform',
        description='Setup Adversarial Misinformation Defense Platform'
    )
    
    parser.add_argument(
        '--skip-deps',
        action='store_true',
        help='Skip dependency installation'
    )
    
    parser.add_argument(
        '--skip-models',
        action='store_true',
        help='Skip model downloading'
    )
    
    parser.add_argument(
        '--skip-tests',
        action='store_true',
        help='Skip initial tests'
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
    
    print("Setting up Adversarial Misinformation Defense Platform...")
    print("=" * 60)
    
    # Check Python version
    try:
        check_python_version()
    except RuntimeError as e:
        print(f"❌ {str(e)}")
        return 1
    
    # Install dependencies
    if not args.skip_deps:
        if not install_dependencies():
            print("❌ Dependency installation failed")
            return 1
    
    # Download pretrained models
    if not args.skip_models:
        if not download_pretrained_models():
            print("❌ Model download failed")
            return 1
    
    # Setup directories
    if not setup_directories():
        print("❌ Directory setup failed")
        return 1
    
    # Create sample configuration
    if not create_sample_configuration():
        print("❌ Configuration creation failed")
        return 1
    
    # Create sample data
    if not create_sample_data():
        print("❌ Sample data creation failed")
        return 1
    
    # Run initial tests
    if not args.skip_tests:
        if not run_initial_tests():
            print("❌ Initial tests failed")
            return 1
    
    # Display completion message
    display_completion_message()
    
    print("\n✅ Platform setup completed successfully!")
    return 0


if __name__ == '__main__':
    sys.exit(main())