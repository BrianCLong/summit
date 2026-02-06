#!/usr/bin/env python3
import json
import os
import sys


def check_drift():
    print("Checking for AI Implementation Drift...")
    drift_detected = False

    # 1. AI Maturity
    maturity_files = ['evidence/ai_maturity.json', 'evidence/ai_maturity.example.json']
    maturity_file = next((f for f in maturity_files if os.path.exists(f)), None)

    if maturity_file:
        print(f"Loading maturity evidence from {maturity_file}")
        try:
            with open(maturity_file) as f:
                data = json.load(f)

            stage = data.get('stage')
            print(f"AI Maturity Stage: {stage}")

            # Drift Check: If Stage 3+, check for strict controls
            if stage in ['stage_3_operational', 'stage_4_future_ready']:
                if not data.get('runtime_monitoring'):
                    print("DRIFT DETECTED: Stage is Operational but Runtime Monitoring is disabled.")
                    drift_detected = True
        except Exception as e:
            print(f"Error checking maturity: {e}")
            drift_detected = True
    else:
        print("Warning: No AI maturity evidence found.")

    # 2. Modality Fit
    task_files = ['evidence/ai_task_profile.json', 'evidence/ai_task_profile.example.json']
    task_file = next((f for f in task_files if os.path.exists(f)), None)

    if task_file:
        print(f"Loading task profile from {task_file}")
        try:
            with open(task_file) as f:
                data = json.load(f)

            if data.get('output_determinism_required') and data.get('chosen_modality') == 'genai':
                 print("DRIFT DETECTED: GenAI used for deterministic task.")
                 drift_detected = True
        except Exception as e:
            print(f"Error checking modality: {e}")
            drift_detected = True
    else:
         print("Warning: No AI task profile evidence found.")

    if drift_detected:
        print("FAIL: Drift detected in AI Implementation.")
        return False

    print("SUCCESS: No drift detected. AI Posture is consistent.")
    return True

if __name__ == "__main__":
    success = check_drift()
    sys.exit(0 if success else 1)
