#!/usr/bin/env python3
"""
Initialization script for the Cognitive NLP Engine.
Sets up required directories, installs dependencies, and starts the service.
"""

import os
import sys
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_environment():
    """Set up the environment for the Cognitive NLP Engine."""
    project_root = os.path.dirname(os.path.abspath(__file__))
    logger.info("Setting up Cognitive NLP Engine at %s", project_root)
    
    # Create required directories
    required_dirs = [
        'logs',
        'cache',
        'data',
        'models'
    ]
    
    for dir_name in required_dirs:
        dir_path = os.path.join(project_root, dir_name)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            logger.info("Created directory: %s", dir_path)
    
    return project_root

def install_dependencies(project_root):
    """Install required dependencies."""
    logger.info("Installing dependencies...")
    
    try:
        # Check if pip is available
        subprocess.run([sys.executable, '-m', 'pip', '--version'], 
                      check=True, capture_output=True)
        
        # Install requirements
        requirements_file = os.path.join(project_root, 'requirements.txt')
        if os.path.exists(requirements_file):
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', requirements_file], 
                          check=True)
            logger.info("Dependencies installed successfully")
        else:
            logger.warning("Requirements file not found: %s", requirements_file)
            
    except subprocess.CalledProcessError as e:
        logger.error("Failed to install dependencies: %s", e)
        return False
    except FileNotFoundError:
        logger.error("pip not found. Please ensure Python is installed correctly.")
        return False
    
    return True

def start_service(project_root):
    """Start the Cognitive NLP Engine service."""
    logger.info("Starting Cognitive NLP Engine service...")
    
    try:
        # Change to api directory
        api_dir = os.path.join(project_root, 'api')
        os.chdir(api_dir)
        
        # Start the FastAPI service
        subprocess.run([
            sys.executable, '-m', 'uvicorn', 
            'main:app', 
            '--host', '0.0.0.0', 
            '--port', '8000',
            '--reload'
        ], check=True)
        
    except subprocess.CalledProcessError as e:
        logger.error("Failed to start service: %s", e)
        return False
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
        return True
    
    return True

def main():
    """Main initialization function."""
    logger.info("Initializing Cognitive NLP Engine...")
    
    # Setup environment
    project_root = setup_environment()
    
    # Install dependencies
    if not install_dependencies(project_root):
        logger.error("Failed to install dependencies. Exiting.")
        sys.exit(1)
    
    # Start service
    logger.info("Initialization complete. Starting service...")
    start_service(project_root)

if __name__ == "__main__":
    main()