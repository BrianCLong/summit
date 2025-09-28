from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import yaml

from tools.gatekeeper.cli import main


def write_file(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def test_check_reports_policy_and_role_issues(tmp_path, capsys):
    policies_dir = tmp_path / "policies"
    write_file(
        policies_dir / "bad.rego",
        """
        package example

        allow {
            input.resource == "*"
        }
        """.strip()
    )

    roles_path = write_file(
        tmp_path / "roles.yaml",
        yaml.safe_dump(
            {
                "roles": [
                    {
                        "name": "admin",
                        "permissions": [
                            {"resource": "*", "actions": ["read", "write"]},
                            {"resource": "projects", "actions": ["*"]},
                            {"resource": "projects", "actions": ["read"]},
                            {"resource": "projects", "actions": ["read"]},
                        ],
                    }
                ]
            },
            sort_keys=False,
        ),
    )

    exit_code = main(
        [
            "check",
            "--policies",
            str(policies_dir / "**" / "*.rego"),
            "--roles",
            str(roles_path),
            "--junit",
            str(tmp_path / "report.xml"),
        ]
    )

    assert exit_code == 1

    stdout = capsys.readouterr().out
    assert "broad-wildcard" in stdout
    assert "missing-tests" in stdout
    assert "shadowed-permission" in stdout

    junit_path = tmp_path / "report.xml"
    assert junit_path.exists()
    assert "testsuite" in junit_path.read_text(encoding="utf-8")


def test_check_fix_normalizes_roles(tmp_path):
    policies_dir = tmp_path / "policies"
    write_file(
        policies_dir / "rule.rego",
        """
        package example

        default allow = false

        allow {
            true
        }
        """.strip()
    )
    write_file(
        policies_dir / "rule_test.rego",
        """
        package example

        test_allow {
            allow
        }
        """.strip()
    )

    roles_content = {
        "roles": [
            {
                "name": "developer",
                "permissions": [
                    {"resource": "projects", "actions": ["write", "read"]},
                    {"resource": "artifacts", "actions": ["publish", "read"]},
                ],
            },
            {
                "name": "admin",
                "permissions": [
                    {"resource": "system", "actions": ["manage"]},
                ],
            },
        ]
    }
    roles_path = write_file(tmp_path / "roles.yaml", yaml.safe_dump(roles_content, sort_keys=False))

    exit_code = main(
        [
            "check",
            "--policies",
            str(policies_dir / "**" / "*.rego"),
            "--roles",
            str(roles_path),
            "--fix",
            "--junit",
            str(tmp_path / "report.xml"),
        ]
    )

    assert exit_code == 0

    normalized = yaml.safe_load(roles_path.read_text(encoding="utf-8"))
    role_names = [role["name"] for role in normalized["roles"]]
    assert role_names == ["admin", "developer"]
    dev_role = next(role for role in normalized["roles"] if role["name"] == "developer")
    dev_projects = next(perm for perm in dev_role["permissions"] if perm["resource"] == "projects")
    assert dev_projects["actions"] == ["read", "write"]

    junit_path = tmp_path / "report.xml"
    assert junit_path.exists()
