import os

from pydantic import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SummitOSINT"
    API_V1_STR: str = "/api/v1"

    # 3rd Party API Keys
    IPQUALITYSCORE_API_KEY: str = os.getenv("IPQUALITYSCORE_API_KEY", "")
    IPINFO_API_KEY: str = os.getenv("IPINFO_API_KEY", "")
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")

    class Config:
        case_sensitive = True


settings = Settings()
