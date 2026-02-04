import os

class Config:
    @property
    def FACTAPI_PRO_ENABLED(self) -> bool:
        return os.getenv("FACTAPI_PRO_ENABLED", "false").lower() == "true"

    @property
    def API_KEY_HEADER_NAME(self) -> str:
        return "X-API-Key"

config = Config()
