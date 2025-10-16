"""
Configuration for Adversarial Misinformation Defense Platform

Centralized configuration management for the platform.
"""

import os
from pathlib import Path
from typing import Any


class Config:
    """
    Configuration class for the platform
    """

    def __init__(self):
        """
        Initialize configuration with defaults and environment variables
        """
        # Core paths
        self.BASE_DIR = Path(__file__).parent.absolute()
        self.DATA_DIR = Path(os.environ.get("AMD_DATA_DIR", self.BASE_DIR / "data"))
        self.MODEL_DIR = Path(os.environ.get("AMD_MODEL_DIR", self.BASE_DIR / "models"))
        self.LOG_DIR = Path(os.environ.get("AMD_LOG_DIR", self.BASE_DIR / "logs"))

        # Create directories if they don't exist
        self.DATA_DIR.mkdir(exist_ok=True)
        self.MODEL_DIR.mkdir(exist_ok=True)
        self.LOG_DIR.mkdir(exist_ok=True)

        # Detection thresholds
        self.DEFAULT_THRESHOLD = float(os.environ.get("AMD_DEFAULT_THRESHOLD", "0.5"))
        self.HIGH_CONFIDENCE_THRESHOLD = float(os.environ.get("AMD_HIGH_CONF_THRESHOLD", "0.8"))
        self.LOW_CONFIDENCE_THRESHOLD = float(os.environ.get("AMD_LOW_CONF_THRESHOLD", "0.3"))

        # Model settings
        self.TEXT_MODEL_NAME = os.environ.get(
            "AMD_TEXT_MODEL", "distilbert-base-uncased-finetuned-sst-2-english"
        )
        self.IMAGE_MODEL_NAME = os.environ.get("AMD_IMAGE_MODEL", "efficientnet-b0")
        self.AUDIO_MODEL_NAME = os.environ.get("AMD_AUDIO_MODEL", "vggish")

        # Training settings
        self.TRAINING_BATCH_SIZE = int(os.environ.get("AMD_TRAINING_BATCH_SIZE", "32"))
        self.TRAINING_EPOCHS = int(os.environ.get("AMD_TRAINING_EPOCHS", "10"))
        self.LEARNING_RATE = float(os.environ.get("AMD_LEARNING_RATE", "0.001"))

        # Adversarial training settings
        self.ADVERSARIAL_TRAINING_ENABLED = (
            os.environ.get("AMD_ADV_TRAINING_ENABLED", "true").lower() == "true"
        )
        self.ADVERSARIAL_SAMPLE_RATIO = float(os.environ.get("AMD_ADV_SAMPLE_RATIO", "0.2"))

        # Logging settings
        self.LOG_LEVEL = os.environ.get("AMD_LOG_LEVEL", "INFO")
        self.LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

        # Performance settings
        self.MAX_WORKERS = int(os.environ.get("AMD_MAX_WORKERS", "4"))
        self.CACHE_SIZE = int(os.environ.get("AMD_CACHE_SIZE", "1000"))
        self.TIMEOUT_SECONDS = int(os.environ.get("AMD_TIMEOUT_SECONDS", "300"))

        # Security settings
        self.ENABLE_SANDBOXING = os.environ.get("AMD_ENABLE_SANDBOXING", "true").lower() == "true"
        self.CONTENT_FILTER_ENABLED = (
            os.environ.get("AMD_CONTENT_FILTER_ENABLED", "true").lower() == "true"
        )

        # Database settings (if applicable)
        self.DATABASE_URL = os.environ.get("AMD_DATABASE_URL", "sqlite:///adversarial_misinfo.db")

        # API settings
        self.API_HOST = os.environ.get("AMD_API_HOST", "localhost")
        self.API_PORT = int(os.environ.get("AMD_API_PORT", "8000"))
        self.API_DEBUG = os.environ.get("AMD_API_DEBUG", "false").lower() == "true"

        # Validation settings
        self.VALIDATION_BENCHMARK = os.environ.get("AMD_VALIDATION_BENCHMARK", "state_of_the_art")
        self.VALIDATION_THRESHOLD = float(os.environ.get("AMD_VALIDATION_THRESHOLD", "0.8"))

        # Exercise settings
        self.EXERCISE_DEFAULT_DURATION = int(
            os.environ.get("AMD_EXERCISE_DURATION", "60")
        )  # minutes
        self.EXERCISE_AUTO_SAVE = os.environ.get("AMD_EXERCISE_AUTO_SAVE", "true").lower() == "true"

    def get_detection_config(self) -> dict[str, Any]:
        """
        Get configuration for detection modules
        """
        return {
            "thresholds": {
                "default": self.DEFAULT_THRESHOLD,
                "high_confidence": self.HIGH_CONFIDENCE_THRESHOLD,
                "low_confidence": self.LOW_CONFIDENCE_THRESHOLD,
            },
            "models": {
                "text": self.TEXT_MODEL_NAME,
                "image": self.IMAGE_MODEL_NAME,
                "audio": self.AUDIO_MODEL_NAME,
            },
            "performance": {
                "max_workers": self.MAX_WORKERS,
                "timeout_seconds": self.TIMEOUT_SECONDS,
            },
        }

    def get_training_config(self) -> dict[str, Any]:
        """
        Get configuration for training modules
        """
        return {
            "batch_size": self.TRAINING_BATCH_SIZE,
            "epochs": self.TRAINING_EPOCHS,
            "learning_rate": self.LEARNING_RATE,
            "adversarial": {
                "enabled": self.ADVERSARIAL_TRAINING_ENABLED,
                "sample_ratio": self.ADVERSARIAL_SAMPLE_RATIO,
            },
        }

    def get_security_config(self) -> dict[str, Any]:
        """
        Get security-related configuration
        """
        return {
            "sandboxing_enabled": self.ENABLE_SANDBOXING,
            "content_filter_enabled": self.CONTENT_FILTER_ENABLED,
        }

    def get_api_config(self) -> dict[str, Any]:
        """
        Get API configuration
        """
        return {"host": self.API_HOST, "port": self.API_PORT, "debug": self.API_DEBUG}

    def get_validation_config(self) -> dict[str, Any]:
        """
        Get validation configuration
        """
        return {"benchmark": self.VALIDATION_BENCHMARK, "threshold": self.VALIDATION_THRESHOLD}


# Global configuration instance
config = Config()


def get_config() -> Config:
    """
    Get the global configuration instance
    """
    return config


def reload_config() -> Config:
    """
    Reload configuration from environment variables
    """
    global config
    config = Config()
    return config
