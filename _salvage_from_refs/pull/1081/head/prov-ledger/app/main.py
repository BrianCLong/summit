from fastapi import FastAPI

from .api import router
from .config import log_config
from .observability import logging_middleware

log_config()
app = FastAPI(title="Provenance Ledger")
app.middleware("http")(logging_middleware)
app.include_router(router)
