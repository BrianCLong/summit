#!/bin/bash
export PYTHONPATH=.
python3 -m pytest tests/test_ai_dep_capture.py tests/test_ai_dep_firewall_typosquat.py tests/test_ai_dep_firewall_slopsquat.py tests/test_ai_dep_firewall_velocity_gate.py tests/test_policy_regression_agent_tools.py --noconftest
