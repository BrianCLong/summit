#!/usr/bin/env python3
import datetime
import json
import os


def load_json_first_match(filenames):
    for f in filenames:
        if os.path.exists(f):
            try:
                with open(f) as fh:
                    return json.load(fh)
            except:
                pass
    return None

def generate_report():
    print("Generating AI Posture Report...")

    report = {
        "generated_at": datetime.datetime.now().isoformat(),
        "maturity": None,
        "tasks": [],
        "authority": []
    }

    # Load Maturity
    maturity = load_json_first_match(['evidence/ai_maturity.json', 'evidence/ai_maturity.example.json'])
    if maturity:
        report['maturity'] = maturity

    # Load Tasks
    task = load_json_first_match(['evidence/ai_task_profile.json', 'evidence/ai_task_profile.example.json'])
    if task:
        report['tasks'].append(task)

    # Load Authority
    authority = load_json_first_match(['evidence/human_authority.json', 'evidence/human_authority.example.json'])
    if authority:
        report['authority'].append(authority)

    # Ensure reports dir exists
    if not os.path.exists('reports'):
        os.makedirs('reports')

    output_path = 'reports/ai_posture.report.json'
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"Report generated at {output_path}")

if __name__ == "__main__":
    generate_report()
