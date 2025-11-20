"""
Configuration for ML Training Service
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Service
    service_name: str = "ml-training"
    environment: str = "development"

    # Model Registry
    registry_postgres_host: str = "localhost"
    registry_postgres_port: int = 5432
    registry_postgres_database: str = "ml_registry"
    registry_postgres_user: str = "postgres"
    registry_postgres_password: str = "postgres"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"
    mlflow_experiment_name: str = "default"

    # Storage
    model_storage_path: str = "/tmp/ml_models"

    # Training
    default_batch_size: int = 32
    default_epochs: int = 100
    default_learning_rate: float = 0.001

    # Distributed Training
    enable_distributed: bool = False
    dist_backend: str = "nccl"

    class Config:
        env_file = ".env"
        case_sensitive = False
