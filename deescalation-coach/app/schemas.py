"""Pydantic schemas for API I/O."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str
    lang: str | None = None


class ToneDiagnostic(BaseModel):
    sentiment: dict[str, float]
    emotion: dict[str, float]
    toxicity: dict[str, float]
    absolutist_score: float = Field(ge=0, le=1)
    caps_ratio: float = Field(ge=0, le=1)


class Rewrite(BaseModel):
    version: str
    text: str


class Guidance(BaseModel):
    tips: list[str]
    evidence_prompts: list[str]


class AnalyzeResponse(BaseModel):
    rewrite: Rewrite
    diagnostic: ToneDiagnostic
    guidance: Guidance
    policy_flags: list[str] = []
