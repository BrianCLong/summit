"""Streamlit visualisation for timeline predictions.

This is a lightweight placeholder so future work can add interactive charts
based on the prediction API.
"""

from typing import Dict


def render_timeline(prediction: Dict[str, str]) -> None:
    print(prediction["prediction"])
