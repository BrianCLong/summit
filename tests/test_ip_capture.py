import os
import json
import pytest
import shutil
import sys

# Ensure summit is in path
sys.path.append(os.getcwd())

from summit.pipelines.ip_capture.pipeline import run_ip_capture

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), '../fixtures')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '../out/test_ip_capture')

@pytest.fixture
def clean_output():
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    yield OUTPUT_DIR

def test_ip_capture_determinism(clean_output):
    input_path = os.path.join(FIXTURES_DIR, 'ip_capture/sample.md')
    out1 = os.path.join(clean_output, 'run1')
    out2 = os.path.join(clean_output, 'run2')

    run_ip_capture(input_path, out1)
    run_ip_capture(input_path, out2)

    with open(os.path.join(out1, 'report.json'), 'r') as f:
        report1 = f.read()
    with open(os.path.join(out2, 'report.json'), 'r') as f:
        report2 = f.read()

    assert report1 == report2

    with open(os.path.join(out1, 'stamp.json'), 'r') as f:
        stamp1 = f.read()
    with open(os.path.join(out2, 'stamp.json'), 'r') as f:
        stamp2 = f.read()

    assert stamp1 == stamp2

def test_ip_capture_redaction(clean_output):
    input_path = os.path.join(FIXTURES_DIR, 'pii/sample_pii.md')
    out_dir = os.path.join(clean_output, 'redaction')

    report, metrics, stamp = run_ip_capture(input_path, out_dir)

    assert metrics.redaction_count >= 2

    with open(os.path.join(out_dir, 'report.json'), 'r') as f:
        content = f.read()

    assert 'alice@example.com' not in content
    assert 'bob.jones@corp.net' not in content
    assert '[REDACTED_EMAIL]' in content

def test_ip_capture_structure(clean_output):
    input_path = os.path.join(FIXTURES_DIR, 'ip_capture/sample.md')
    out_dir = os.path.join(clean_output, 'structure')

    report, metrics, stamp = run_ip_capture(input_path, out_dir)

    assert len(report.moments) >= 2
    assert report.moments[0].id.startswith("EVID:ip-capture:MOC:")

    assert len(report.methods) >= 1
    method = report.methods[0]
    assert len(method.steps) >= 3
    assert "Extracted" in report.brief.summary
