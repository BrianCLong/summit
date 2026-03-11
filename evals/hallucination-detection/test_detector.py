import pytest
import sys
import os
from pathlib import Path

# Add the directory containing detector.py to sys.path
sys.path.append(str(Path(__file__).resolve().parent))

from detector import HallucinationDetector

def test_faithful_answer():
    detector = HallucinationDetector()
    context = "The project cost $5 million and was completed in 2021."
    answer = "The project cost $5 million and was finished in 2021."
    result = detector.evaluate(answer, context)
    assert not result["is_hallucinated"]
    assert result["faithfulness_score"] == 1.0

def test_invented_number():
    detector = HallucinationDetector()
    context = "The project cost $5 million."
    answer = "The project cost $15 million."
    result = detector.evaluate(answer, context)
    assert result["is_hallucinated"]
    assert any(issue["type"] == "invented_number" for issue in result["issues"])

def test_contradiction():
    detector = HallucinationDetector()
    context = "The policy prohibits the use of personal devices."
    answer = "The policy allows the use of personal devices."
    result = detector.evaluate(answer, context)
    assert result["is_hallucinated"]
    assert any(issue["type"] == "contradiction" for issue in result["issues"])

def test_causality():
    detector = HallucinationDetector()
    context = "Revenue increased by 20% after the product launch. Marketing spend was reduced."
    answer = "The increase in revenue was caused by the reduction in marketing spend."
    result = detector.evaluate(answer, context)
    assert result["is_hallucinated"]
    assert any(issue["type"] == "incorrect_causality" for issue in result["issues"])
