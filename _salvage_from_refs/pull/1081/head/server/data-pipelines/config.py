"""
Configuration for IntelGraph Data Pipelines
Central configuration management for ETL/ELT processes
"""

from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class DatabaseConfig(BaseModel):
    """Database connection configuration"""

    neo4j_uri: str = Field(default="bolt://localhost:7687")
    neo4j_user: str = Field(default="neo4j")
    neo4j_password: str = Field(default="password")

    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)
    postgres_db: str = Field(default="intelgraph")
    postgres_user: str = Field(default="postgres")
    postgres_password: str = Field(default="password")

    redis_url: str = Field(default="redis://localhost:6379/0")


class StorageConfig(BaseModel):
    """Object storage configuration"""

    provider: str = Field(default="local")  # local, s3, gcs, azure
    bucket_name: str = Field(default="intelgraph-staging")

    # AWS S3 configuration
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = Field(default="us-east-1")

    # Local storage configuration
    local_storage_path: Path = Field(default="./staging")


class PipelineConfig(BaseModel):
    """Pipeline execution configuration"""

    max_workers: int = Field(default=4)
    batch_size: int = Field(default=1000)
    retry_attempts: int = Field(default=3)
    retry_delay_seconds: int = Field(default=60)

    # Data quality settings
    quality_check_enabled: bool = Field(default=True)
    quality_threshold: float = Field(default=0.9)

    # Deduplication settings
    deduplication_enabled: bool = Field(default=True)
    similarity_threshold: float = Field(default=0.85)


class MonitoringConfig(BaseModel):
    """Monitoring and alerting configuration"""

    prometheus_enabled: bool = Field(default=True)
    prometheus_port: int = Field(default=8000)

    # Alerting
    slack_webhook_url: str | None = None
    email_notifications: list[str] = Field(default_factory=list)

    # Logging
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="structured")


class DataPipelineSettings(BaseSettings):
    """Main configuration class for data pipelines"""

    # Environment
    environment: str = Field(default="development")
    debug: bool = Field(default=False)

    # Component configurations
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    pipeline: PipelineConfig = Field(default_factory=PipelineConfig)
    monitoring: MonitoringConfig = Field(default_factory=MonitoringConfig)

    # Airflow configuration
    airflow_dags_folder: Path = Field(default="./airflow/dags")
    airflow_connections: dict[str, str] = Field(default_factory=dict)

    # Source registry
    sources_config_file: Path = Field(default="./sources.yaml")

    class Config:
        env_file = ".env"
        env_nested_delimiter = "_"
        env_prefix = "INTELGRAPH_"


# Global settings instance
settings = DataPipelineSettings()


def get_neo4j_connection_string() -> str:
    """Get Neo4j connection string"""
    return (
        f"{settings.database.neo4j_uri}?"
        f"user={settings.database.neo4j_user}&"
        f"password={settings.database.neo4j_password}"
    )


def get_postgres_connection_string() -> str:
    """Get PostgreSQL connection string"""
    return (
        f"postgresql://{settings.database.postgres_user}:"
        f"{settings.database.postgres_password}@"
        f"{settings.database.postgres_host}:"
        f"{settings.database.postgres_port}/"
        f"{settings.database.postgres_db}"
    )


def get_staging_path(relative_path: str = "") -> Path:
    """Get full path in staging area"""
    base_path = settings.storage.local_storage_path
    if relative_path:
        return base_path / relative_path
    return base_path


def ensure_staging_directories():
    """Ensure all required staging directories exist"""
    directories = ["raw", "processed", "transformed", "failed", "archives"]

    for directory in directories:
        path = get_staging_path(directory)
        path.mkdir(parents=True, exist_ok=True)


# Source registry configuration
class SourceConfig(BaseModel):
    """Configuration for a data source"""

    name: str
    type: str  # csv, json, xml, api, kafka, etc.
    enabled: bool = Field(default=True)
    schedule: str | None = None  # Cron expression

    # Connection details
    connection: dict[str, str] = Field(default_factory=dict)

    # Processing settings
    batch_size: int = Field(default=1000)
    parallel_processing: bool = Field(default=True)

    # Data validation
    schema_file: str | None = None
    validation_enabled: bool = Field(default=True)

    # Transformation settings
    transformation_rules: list[str] = Field(default_factory=list)

    # Target settings
    target_labels: list[str] = Field(default_factory=list)
    target_properties: dict[str, str] = Field(default_factory=dict)


# Initialize staging directories on import
ensure_staging_directories()
