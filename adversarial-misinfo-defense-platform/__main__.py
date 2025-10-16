"""
Main entry point for Adversarial Misinformation Defense Platform

This module allows the platform to be executed directly as a Python module.
"""
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import main entry point
from .main import main

if __name__ == "__main__":
    sys.exit(main())