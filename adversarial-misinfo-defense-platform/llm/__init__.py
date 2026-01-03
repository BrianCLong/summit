"""
LLM Integration Module for Adversarial Misinformation Defense Platform

Provides Claude API integration for AI-powered scenario generation,
threat actor profiling, and semantic tactic evolution.
"""

from .claude_client import ClaudeClient, LLMConfig
from .prompts import PromptTemplates
from .scenario_generator import LLMScenarioGenerator

__all__ = [
    "ClaudeClient",
    "LLMConfig",
    "PromptTemplates",
    "LLMScenarioGenerator",
]
