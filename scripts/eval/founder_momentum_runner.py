#!/usr/bin/env python3
"""
Runner for founder momentum scoring.
"""
from summit.evaluation.startup_momentum.momentum_score import compute_momentum_score

if __name__ == "__main__":
    score = compute_momentum_score("test problem", [], [], {})
    print(f"Momentum score: {score}")
