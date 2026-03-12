import pytest
import os
import json
import subprocess

# Mock the database path so we don't pollute the real one
os.environ["WORKBENCH_DB_TEST"] = "1"

# In actual test environment, the workbench imports should be patching load_db/save_db
# but since it's a CLI script, we'll run it as a subprocess to test the actual CLI behavior.

def run_workbench(args):
    # Add a custom DB path variable logic to the CLI script or just let it use a test-specific one
    # For now, let's just run it in the actual context
    script_path = os.path.join(os.path.dirname(__file__), "../../summit/cli/personas_workbench.py")
    env = os.environ.copy()

    result = subprocess.run(
        ["python", script_path] + args,
        capture_output=True,
        text=True,
        env=env
    )
    return result

def test_workbench_plan_and_show():
    # 1. Plan playbook
    res = run_workbench([
        "plan-playbooks",
        "--persona-id", "P_TEST",
        "--risk-level", "HIGH",
        "--platforms", "linkedin", "twitter",
        "--campaign-id", "C_TEST",
        "--narrative-type", "executive-targeting"
    ])

    # Must contain the defensive planning banner
    assert "Defensive Planning Only - No Automated Engagement" in res.stdout
    assert "Planned Playbook:" in res.stdout
    assert "EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE_INSTANCE_P_TEST" in res.stdout

    # 2. Show playbook
    res2 = run_workbench([
        "show-playbook",
        "--instance-id", "EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE_INSTANCE_P_TEST"
    ])

    assert "Defensive Planning Only - No Automated Engagement" in res2.stdout
    assert "Baseline Executive Mention Volume" in res2.stdout
    assert "PLANNED" in res2.stdout

def test_workbench_update_status():
    instance_id = "EXECUTIVE_BRAND_PERSONA_ARMY_DEFENSE_INSTANCE_P_TEST"

    # Update step status
    res = run_workbench([
        "update-step-status",
        "--instance-id", instance_id,
        "--step-name", "Baseline Executive Mention Volume",
        "--status", "DONE"
    ])

    assert "Defensive Planning Only - No Automated Engagement" in res.stdout
    assert "Updated 'Baseline Executive Mention Volume' status to 'DONE'" in res.stdout

    # Verify via show
    res2 = run_workbench([
        "show-playbook",
        "--instance-id", instance_id
    ])

    assert "Baseline Executive Mention Volume" in res2.stdout
    # Status should be updated to DONE
    assert "DONE" in res2.stdout

def teardown_module(module):
    # Clean up the test DB
    db_path = os.path.join(os.path.dirname(__file__), "../../summit/cli/.personas_workbench_db.json")
    if os.path.exists(db_path):
        os.remove(db_path)
