"""Entrypoint for FastAPI application."""

from __future__ import annotations

from fastapi import FastAPI

from .api import router

app = FastAPI(title="deescalation-coach")
app.include_router(router)
