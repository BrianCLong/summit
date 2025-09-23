"""Pydantic schemas for API I/O."""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str
    lang: Optional[str] = None


class ToneDiagnostic(BaseModel):
    sentiment: Dict[str, float]
    emotion: Dict[str, float]
    toxicity: Dict[str, float]
    absolutist_score: float = Field(ge=0, le=1)
    caps_ratio: float = Field(ge=0, le=1)


class Rewrite(BaseModel):
    version: str
    text: str


class Guidance(BaseModel):
    tips: List[str]
    evidence_prompts: List[str]


class AnalyzeResponse(BaseModel):
    rewrite: Rewrite
    diagnostic: ToneDiagnostic
    guidance: Guidance
    policy_flags: List[str] = []
