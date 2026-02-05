from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    platform_name: str = "Summit Platform Spine"
    version: str = "0.1.0-week1"

    class Config:
        env_prefix = "SUMMIT_"

settings = Settings()
