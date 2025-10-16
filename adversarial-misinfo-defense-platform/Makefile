# Makefile for Adversarial Misinformation Defense Platform

# Variables
PYTHON := python3
PIP := pip3
PROJECT_NAME := adversarial-misinfo-defense
PACKAGE_NAME := adversarial_misinfo_defense

# Default target
.PHONY: help
help:
	@echo "Adversarial Misinformation Defense Platform - Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make install          Install dependencies"
	@echo "  make setup            Setup platform environment"
	@echo "  make test             Run tests"
	@echo "  make validate         Run validation suite"
	@echo "  make demo             Run demonstration"
	@echo "  make clean            Clean build artifacts"
	@echo "  make docs             Generate documentation"
	@echo "  make package          Create distributable package"
	@echo "  make install-package  Install package in development mode"
	@echo "  make uninstall        Uninstall package"
	@echo "  make help             Show this help message"

# Install dependencies
.PHONY: install
install:
	$(PIP) install -r requirements.txt

# Setup platform environment
.PHONY: setup
setup: install
	$(PYTHON) setup_platform.py

# Run tests
.PHONY: test
test:
	$(PYTHON) -m pytest tests/ -v

# Run validation suite
.PHONY: validate
validate:
	$(PYTHON) run_validation.py --mode full

# Run demonstration
.PHONY: demo
demo:
	$(PYTHON) demo.py

# Clean build artifacts
.PHONY: clean
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type f -name "*.log" -delete
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf reports/

# Generate documentation
.PHONY: docs
docs:
	@echo "Generating documentation..."
	@echo "Documentation files are located in docs/ directory"

# Create distributable package
.PHONY: package
package:
	$(PYTHON) setup.py sdist bdist_wheel

# Install package in development mode
.PHONY: install-package
install-package:
	$(PIP) install -e .

# Uninstall package
.PHONY: uninstall
uninstall:
	$(PIP) uninstall $(PROJECT_NAME) -y

# Run platform with different modes
.PHONY: detect
detect:
	$(PYTHON) main.py detect --text "This is a sample text to analyze for misinformation"

.PHONY: train
train:
	$(PYTHON) main.py train --epochs 10

.PHONY: exercise
exercise:
	$(PYTHON) main.py exercise --interactive

.PHONY: evolve
evolve:
	$(PYTHON) main.py evolve --cycles 3

# Quick start targets
.PHONY: quick-start
quick-start: install setup demo

.PHONY: full-validation
full-validation: validate demo

# Development targets
.PHONY: format
format:
	$(PYTHON) -m black .

.PHONY: lint
lint:
	$(PYTHON) -m flake8 .

.PHONY: type-check
type-check:
	$(PYTHON) -m mypy .

.PHONY: check
check: format lint type-check

# Run all checks
.PHONY: all-checks
all-checks: check test validate

# Report target
.PHONY: report
report:
	@echo "Generating validation report..."
	$(PYTHON) run_validation.py --mode validation --output reports/latest_validation.json
	@echo "Report saved to reports/latest_validation.json"

# Example usage
.PHONY: example
example:
	$(PYTHON) example_usage.py

# Run CLI
.PHONY: cli
cli:
	$(PYTHON) cli_entry.py --help

# Run specific CLI commands
.PHONY: cli-detect
cli-detect:
	$(PYTHON) cli_entry.py detect --text "Example text for detection"

.PHONY: cli-validate
cli-validate:
	$(PYTHON) cli_entry.py validate

.PHONY: cli-train
cli-train:
	$(PYTHON) cli_entry.py train

.PHONY: cli-exercise
cli-exercise:
	$(PYTHON) cli_entry.py exercise --interactive

.PHONY: cli-evolve
cli-evolve:
	$(PYTHON) cli_entry.py evolve