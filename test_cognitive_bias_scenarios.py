#!/usr/bin/env python3
"""
Test script for simulating cognitive bias scenarios.
"""

import unittest

from intelgraph.cognitive_bias_detector import BiasDetector
from intelgraph.debiasing_engine import DebiasingEngine
from intelgraph.cognitive_bias_mitigation_integration import CognitiveBiasMitigationSystem

class TestCognitiveBiasScenarios(unittest.TestCase):
    """Test suite for cognitive bias scenarios."""

    def setUp(self):
        """Set up the test environment."""
        self.bias_mitigation_system = CognitiveBiasMitigationSystem()

    def test_anchoring_bias(self):
        """Test for anchoring bias."""
        decision_context = {
            "scenario": "Estimating the number of compromised accounts in a security breach.",
            "initial_estimate": 100,  # The anchor
            "final_estimate": 120,  # Insufficient adjustment (20% change)
            "new_information": "A detailed analysis suggests over 1,000 accounts were affected.",
            "adjustment_process": {
                "substantiality": "low"
            }
        }
        agent_state = {
            "cognitive_load": 0.8,
            "stress_level": 0.7
        }

        detections = self.bias_mitigation_system.bias_detector.detect_bias(decision_context, agent_state)

        anchoring_detected = any(d.bias_type.value == 'anchoring_bias' for d in detections)
        self.assertTrue(anchoring_detected, "Anchoring bias was not detected.")

        if anchoring_detected:
            anchoring_detection = next(d for d in detections if d.bias_type.value == 'anchoring_bias')
            debiasing_results = self.bias_mitigation_system.debiasing_engine.apply_debiasing(anchoring_detection, decision_context)
            self.assertGreater(len(debiasing_results), 0, "No debiasing strategies were applied for anchoring bias.")

            # Check if a relevant strategy was applied
            relevant_strategy_applied = any(r.strategy_applied.value in ['anchor_and_adjust', 'actively_seek_disconfirming_evidence'] for r in debiasing_results)
            self.assertTrue(relevant_strategy_applied, "A relevant debiasing strategy for anchoring was not applied.")

    def test_confirmation_bias(self):
        """Test for confirmation bias."""
        decision_context = {
            "scenario": "Evaluating the source of a cyber attack.",
            "current_belief": True, # The agent believes the source is a known threat actor
            "evidence": [
                {"source": "Firewall logs", "supports": True},
                {"source": "IP reputation service", "supports": True},
                {"source": "Decoy server logs", "supports": False, "details": "Traffic pattern doesn't match known TTPs."},
                {"source": "Threat intel feed", "supports": True},
                {"source": "Malware analysis", "supports": True},
                {"source": "Dark web chatter", "supports": True},
            ],
            "information_gathering": {
                "confirming_search": 0.9,
                "disconfirming_search": 0.1
            }
        }
        agent_state = {
            "confidence": 0.9,
            "emotional_state": {"anxiety": 0.1}
        }

        detections = self.bias_mitigation_system.bias_detector.detect_bias(decision_context, agent_state)

        confirmation_detected = any(d.bias_type.value == 'confirmation_bias' for d in detections)
        self.assertTrue(confirmation_detected, "Confirmation bias was not detected.")

        if confirmation_detected:
            confirmation_detection = next(d for d in detections if d.bias_type.value == 'confirmation_bias')
            debiasing_results = self.bias_mitigation_system.debiasing_engine.apply_debiasing(confirmation_detection, decision_context)
            self.assertGreater(len(debiasing_results), 0, "No debiasing strategies were applied for confirmation bias.")

            self.assertTrue(
                any(r.strategy_applied.value == 'actively_seek_disconfirming_evidence' for r in debiasing_results),
                "The 'actively_seek_disconfirming_evidence' strategy was not applied."
            )

    def test_framing_effect(self):
        """Test for framing effect."""
        # Scenario framed in terms of gains
        decision_context_gains = {
            "scenario": "Choosing a cybersecurity strategy.",
            "option_a": "Strategy A will save 200 of our 600 critical assets.",
            "option_b": "Strategy B has a 1/3 probability of saving all 600 assets and a 2/3 probability of saving none.",
            "alternatives": ["Strategy C", "Strategy D"],
            "decision_frame": {
                "presentation": "gains",
                "presentation_bias": 0.8
            }
        }

        # Same scenario framed in terms of losses
        decision_context_losses = {
            "scenario": "Choosing a cybersecurity strategy.",
            "option_a": "If we adopt Strategy A, 400 of our 600 critical assets will be lost.",
            "option_b": "If we adopt Strategy B, there is a 1/3 probability that no assets will be lost, and a 2/3 probability that all 600 assets will be lost.",
            "alternatives": ["Strategy C", "Strategy D"],
            "decision_frame": {
                "presentation": "losses",
                "presentation_bias": 0.8
            }
        }
        agent_state = {"risk_preference": "risk-averse"}

        # Test detection for both frames
        detections_gains = self.bias_mitigation_system.bias_detector.detect_bias(decision_context_gains, agent_state)
        framing_detected_gains = any(d.bias_type.value == 'framing_effect' for d in detections_gains)
        self.assertTrue(framing_detected_gains, "Framing effect was not detected in the gains-framed scenario.")

        detections_losses = self.bias_mitigation_system.bias_detector.detect_bias(decision_context_losses, agent_state)
        framing_detected_losses = any(d.bias_type.value == 'framing_effect' for d in detections_losses)
        self.assertTrue(framing_detected_losses, "Framing effect was not detected in the losses-framed scenario.")

        if framing_detected_gains:
            framing_detection = next(d for d in detections_gains if d.bias_type.value == 'framing_effect')
            debiasing_results = self.bias_mitigation_system.debiasing_engine.apply_debiasing(framing_detection, decision_context_gains)
            self.assertGreater(len(debiasing_results), 0, "No debiasing strategies were applied for the framing effect.")

            self.assertTrue(
                any(r.strategy_applied.value == 'red_teaming' for r in debiasing_results),
                "The 'red_teaming' strategy was not applied for the framing effect."
            )

if __name__ == "__main__":
    unittest.main()
