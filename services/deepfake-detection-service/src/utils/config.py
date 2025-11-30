"""Configuration helpers for the deepfake detection service."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_storage_path: str = "./models"
    video_model_version: str = "v1.0.0"
    audio_model_version: str = "v1.0.0"
    image_model_version: str = "v1.0.0"

    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "deepfake-media"

    class Config:
        env_prefix = "DEEPFAKE_"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
