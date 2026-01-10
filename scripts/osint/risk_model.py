#!/usr/bin/env python3
"""
Risk scoring utilities for passive OSINT reconnaissance.

A finding carries a category, evidence string, and contextual signals. This module
assigns a 0-100 severity score using deterministic weights so analysts can triage
results quickly without needing to inspect raw API payloads.
"""
from __future__ import annotations

import math
from typing import Iterable, Mapping


CATEGORY_WEIGHTS = {
    "secret-leak": 30,
    "metadata-leak": 20,
    "supply-chain": 25,
}

SIGNAL_WEIGHTS = {
    "has_secret_pattern": 40,
    "metadata_internal_marker": 12,
    "metadata_inventory": 4,
    "non_corporate_author": 20,
    "unverified_signature": 25,
    "maintainer_churn": 15,
    "stale_release": 10,
    "public_fork": 8,
    "ambiguous_license": 12,
    "missing_provenance": 18,
}


def score_signals(category: str, signals: Iterable[str]) -> int:
  """
  Compute a deterministic risk score between 0-100 for a finding.
  The calculation combines a base category weight with the sum of the
  configured signal weights. Scores are capped at 100.
  """
  base = CATEGORY_WEIGHTS.get(category, 10)
  total = base
  for signal in signals:
    total += SIGNAL_WEIGHTS.get(signal, 5)
  # Smoothly cap at 100 to avoid runaway totals when many weak signals stack up.
  return int(min(100, math.ceil(total)))


def rank_findings(findings: Iterable[Mapping]) -> list[Mapping]:
  """
  Return findings sorted by severity descending to make triage ordering explicit.
  """
  return sorted(findings, key=lambda finding: finding.get("severity", 0), reverse=True)
