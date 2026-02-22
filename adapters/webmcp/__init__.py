"""WebMCP adapter package for Summit evidence ingestion."""

from .ingest import WebMCPSession, normalize_session_transcript

__all__ = ["WebMCPSession", "normalize_session_transcript"]
