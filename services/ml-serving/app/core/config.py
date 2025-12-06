from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "IntelGraph ML Serving"
    API_V1_STR: str = "/api/v1"
    MLFLOW_TRACKING_URI: str = "http://mlflow:5000"
    MODEL_STORE_PATH: str = "/models"
    ENV: str = "production"

    class Config:
        env_file = ".env"

settings = Settings()
