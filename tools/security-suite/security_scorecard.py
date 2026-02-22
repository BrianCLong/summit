#!/usr/bin/env python3
"""
Security Scorecard Generator
Scores the project based on security best practices.
"""

import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SERVER_SRC = ROOT / "server" / "src"
DOCKER_COMPOSE = ROOT / "docker-compose.yml"


def check_auth_coverage():
    """Calculates percentage of routes with auth middleware."""
    total_routes = 0
    secured_routes = 0

    if not SERVER_SRC.exists():
        return 0, 0

    route_pattern = re.compile(r"(router|app)\.(get|post|put|delete|patch)\(['\"]([^'\"]+)['\"]")

    for root, _, files in os.walk(SERVER_SRC):
        for file in files:
            if file.endswith(".ts") or file.endswith(".js"):
                try:
                    with open(os.path.join(root, file), encoding="utf-8") as f:
                        content = f.read()
                        matches = route_pattern.findall(content)
                        for match in matches:
                            total_routes += 1
                            if (
                                "ensureAuthenticated" in content
                                or "passport.authenticate" in content
                                or "requireStepUp" in content
                            ):
                                secured_routes += 1
                except:
                    pass

    return total_routes, secured_routes


def check_secrets_management():
    """Checks for .env files and hardcoded secrets."""
    issues = []

    # Check for .env committed
    for root, _, files in os.walk(ROOT):
        if ".git" in root:
            continue
        for file in files:
            if file == ".env":
                issues.append(
                    f"Found committed .env file at {os.path.relpath(os.path.join(root, file), ROOT)}"
                )

    # Check for hardcoded secrets (heuristic)
    secret_pattern = re.compile(
        r"(api_key|password|secret)\s*=\s*['\"](?!process\.env)[^'\"]{10,}['\"]", re.IGNORECASE
    )

    for root, _, files in os.walk(SERVER_SRC):
        for file in files:
            if file.endswith(".ts") or file.endswith(".js"):
                if "test" in root or "spec" in file:
                    continue
                try:
                    with open(os.path.join(root, file), encoding="utf-8") as f:
                        content = f.read()
                        matches = secret_pattern.findall(content)
                        if matches:
                            issues.append(
                                f"Potential hardcoded secret in {os.path.relpath(os.path.join(root, file), ROOT)}"
                            )
                except:
                    pass

    return issues


def check_input_validation():
    """Checks for Zod/Joi usage in controllers."""
    total_controllers = 0
    validated_controllers = 0

    if not SERVER_SRC.exists():
        return 0, 0

    for root, _, files in os.walk(SERVER_SRC):
        for file in files:
            if "controller" in file.lower() or "route" in file.lower():
                if file.endswith(".ts") or file.endswith(".js"):
                    total_controllers += 1
                    try:
                        with open(os.path.join(root, file), encoding="utf-8") as f:
                            content = f.read()
                            if (
                                "zod" in content
                                or "joi" in content
                                or "express-validator" in content
                            ):
                                validated_controllers += 1
                    except:
                        pass
    return total_controllers, validated_controllers


def main():
    print("Generating Security Scorecard...")

    total_routes, secured_routes = check_auth_coverage()
    auth_score = (secured_routes / total_routes * 100) if total_routes > 0 else 0

    secret_issues = check_secrets_management()
    secret_score = 100 - (len(secret_issues) * 10)
    secret_score = max(0, secret_score)

    total_ctrl, val_ctrl = check_input_validation()
    val_score = (val_ctrl / total_ctrl * 100) if total_ctrl > 0 else 0

    # Calculate overall score
    overall_score = (auth_score + secret_score + val_score) / 3

    report = {
        "overall_score": round(overall_score, 2),
        "metrics": {
            "authentication_coverage": {
                "score": round(auth_score, 2),
                "details": f"{secured_routes}/{total_routes} routes secured",
            },
            "secrets_management": {"score": secret_score, "issues": secret_issues},
            "input_validation_coverage": {
                "score": round(val_score, 2),
                "details": f"{val_ctrl}/{total_ctrl} controllers/routes use validation libs",
            },
        },
    }

    report_path = ROOT / "docs" / "security" / "SECURITY_SCORECARD.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)

    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Scorecard generated at {report_path}")
    print("Overall score generated successfully.")


if __name__ == "__main__":
    main()
