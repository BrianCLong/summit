from __future__ import annotations

from fastapi import FastAPI

from .api import router

app = FastAPI(title="Graph XAI")
app.include_router(router)
