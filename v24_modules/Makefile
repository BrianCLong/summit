# v24_modules/Makefile

.PHONY: install test clean

install:
	@echo "Installing Python dependencies..."
	@pip install -r requirements.txt

test:
	@echo "Running tests..."
	@pytest tests/

clean:
	@echo "Cleaning up build artifacts..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 
	@find . -type f -name "*.pyc" -delete
	@rm -rf .pytest_cache/
	@echo "Clean up complete."
