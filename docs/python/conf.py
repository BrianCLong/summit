"""Sphinx configuration for Summit's Python ML documentation."""

from __future__ import annotations

import os
import sys
from datetime import datetime

# Ensure the ML engine sources are importable.
PROJECT_ROOT = os.path.abspath(os.path.join(__file__, "../../.."))
ML_ENGINE_PATH = os.path.join(PROJECT_ROOT, "apps", "ml-engine", "src", "python")
sys.path.insert(0, ML_ENGINE_PATH)

project = "Summit ML Engine"
copyright = f"{datetime.utcnow():%Y}, Summit"
author = "Summit Engineering"

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
]

autodoc_typehints = "description"
autodoc_mock_imports = [
    "Levenshtein",
    "numpy",
    "pandas",
    "sklearn",
    "joblib",
    "torch",
    "sentence_transformers",
]

templates_path = ["_templates"]
exclude_patterns: list[str] = []

html_theme = "alabaster"
html_static_path: list[str] = []

# Configure the Markdown builder so CI emits lightweight references that review cleanly.
markdown_documents = [
    ("index", "index"),
    ("modules", "modules"),
]
