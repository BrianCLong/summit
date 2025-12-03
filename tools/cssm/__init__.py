"""Canonical Semantic Schema Mapper (CSSM).

This package exposes utilities to align heterogeneous source schemas with the
canonical Summit business ontology.  The primary entry point is the
``map_sources`` function which returns deterministic schema annotations,
compatibility matrices, and migration aides for downstream automation.
"""

from .cssm import CanonicalSemanticSchemaMapper, map_sources

__all__ = ["CanonicalSemanticSchemaMapper", "map_sources"]
