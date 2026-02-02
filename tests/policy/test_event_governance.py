import pytest
import yaml
from pathlib import Path
import sys
import os

# Add root to sys.path to import from tools
sys.path.append(os.getcwd())
from tools.event_playbook import is_action_allowed

def test_event_policy_denies_offensive_actions():
    policy_path = Path("policy/event_policy.yaml")
    assert policy_path.exists()

    # Negative cases
    assert not is_action_allowed("generate_counter_message")
    assert not is_action_allowed("recommend_amplification")
    assert not is_action_allowed("identify_persuadable_individuals")
    assert not is_action_allowed("unknown_action") # Deny by default

def test_event_policy_allows_analytics_actions():
    # Positive cases
    assert is_action_allowed("compute_aggregate_metrics")
    assert is_action_allowed("emit_evidence_bundle")
