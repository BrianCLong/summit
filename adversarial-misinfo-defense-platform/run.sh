#!/bin/bash

# Run script for Adversarial Misinformation Defense Platform

# Set script directory as working directory
cd "$(dirname "$0")"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    
    # Install dependencies
    echo "Installing dependencies..."
    pip install -r requirements.txt
    
    # Install package in development mode
    echo "Installing package..."
    pip install -e .
else
    # Activate virtual environment
    source venv/bin/activate
fi

# Parse command line arguments
case "$1" in
    "detect")
        if [ -z "$2" ]; then
            echo "Usage: ./run.sh detect <text>"
            exit 1
        fi
        python3 main.py detect --text "$2"
        ;;
    "validate")
        python3 main.py validate
        ;;
    "train")
        python3 main.py train
        ;;
    "exercise")
        if [ "$2" == "--interactive" ] || [ "$2" == "-i" ]; then
            python3 main.py exercise --interactive
        else
            python3 main.py exercise
        fi
        ;;
    "evolve")
        python3 main.py evolve
        ;;
    "demo")
        python3 example_usage.py
        ;;
    "test")
        python3 -m pytest tests/ -v
        ;;
    "cli")
        shift
        python3 cli_entry.py "$@"
        ;;
    "help"|*)
        echo "Adversarial Misinformation Defense Platform - Run Script"
        echo ""
        echo "Usage:"
        echo "  ./run.sh detect <text>      Run detection on text content"
        echo "  ./run.sh validate           Run validation suite"
        echo "  ./run.sh train              Run adversarial training"
        echo "  ./run.sh exercise [-i]      Manage red/blue team exercises"
        echo "  ./run.sh evolve             Run autonomous tactic evolution"
        echo "  ./run.sh demo               Run demonstration"
        echo "  ./run.sh test               Run tests"
        echo "  ./run.sh cli <command>      Run CLI commands"
        echo "  ./run.sh help               Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./run.sh detect \"This shocking revelation will change everything!\""
        echo "  ./run.sh exercise --interactive"
        echo "  ./run.sh cli --help"
        echo "  ./run.sh cli detect --text \"Sample text\""
        ;;
esac