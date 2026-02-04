import os

class Settings:
    PROJECT_NAME: str = "Summit Platform"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/summit")

settings = Settings()
