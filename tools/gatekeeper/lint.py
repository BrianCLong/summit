"""Static linting utilities for Gatekeeper RBAC policies and role maps."""

from __future__ import annotations

import glob
import re
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

try:  # pragma: no cover - optional dependency guard
    import yaml
except ImportError as exc:  # pragma: no cover
    raise RuntimeError("PyYAML is required to run gatekeeper checks") from exc


@dataclass
class LintIssue:
    """Structured representation of a linting finding."""

    file: str
    line: int
    rule: str
    message: str
    severity: str = "error"

    def sort_key(self) -> tuple[str, int, str]:
        return (self.file, self.line, self.rule)


BROAD_WILDCARD_PATTERN = re.compile(r'"([^"\\]*\\.)*[^"\\]*\*[^"\\]*"')
RULE_DEFINITION_PATTERN = re.compile(
    r"^(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*(?:\[[^\]]+\])?\s*{", re.MULTILINE
)
COMMENT_PATTERN = re.compile(r"^\s*#")


class PolicyLintResult:
    """Container for policy linting output."""

    def __init__(self, issues: Sequence[LintIssue], checked_files: Sequence[Path]):
        self.issues = list(issues)
        self.checked_files = list(checked_files)


class RoleLintResult:
    """Container for role map linting output and optional normalization."""

    def __init__(self, issues: Sequence[LintIssue], normalized: str | None = None):
        self.issues = list(issues)
        self.normalized = normalized


def expand_policy_globs(patterns: Sequence[str]) -> list[Path]:
    """Expand the provided glob patterns into an ordered list of policy paths."""

    paths: list[Path] = []
    for pattern in patterns:
        for match in sorted(glob.glob(pattern, recursive=True)):
            path = Path(match)
            if path.is_file():
                paths.append(path)
    return paths


def lint_policies(paths: Sequence[Path]) -> PolicyLintResult:
    """Lint the provided Rego policy files for common safety violations."""

    issues: list[LintIssue] = []
    checked: list[Path] = []

    for path in paths:
        try:
            text = path.read_text(encoding="utf-8")
        except FileNotFoundError:
            continue

        checked.append(path)
        stripped_lines = text.splitlines()

        # Broad wildcard detection ("*") inside string literals
        for match in BROAD_WILDCARD_PATTERN.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            # Skip comments entirely containing the match
            line_text = stripped_lines[line - 1] if 0 <= line - 1 < len(stripped_lines) else ""
            if COMMENT_PATTERN.match(line_text):
                continue
            issues.append(
                LintIssue(
                    file=str(path),
                    line=line,
                    rule="broad-wildcard",
                    message="Avoid broad wildcard match in policy string literal.",
                )
            )

        # Unreachable rule detection: rules never referenced outside their definition
        rule_references: dict[str, int] = {}
        for match in RULE_DEFINITION_PATTERN.finditer(text):
            name = match.group("name")
            line = text.count("\n", 0, match.start()) + 1
            if name.startswith("_"):
                # private helper rule, skip
                continue
            occurrences = len(re.findall(rf"\b{name}\b", text))
            rule_references[name] = occurrences
            if occurrences <= 1:
                issues.append(
                    LintIssue(
                        file=str(path),
                        line=line,
                        rule="unreachable-rule",
                        message=f"Rule '{name}' is never referenced and may be dead code.",
                        severity="warning",
                    )
                )

        # Missing tests: policy file without *_test.rego companion in the same directory
        if not path.name.endswith("_test.rego"):
            test_files = list(path.parent.glob("*_test.rego"))
            if not test_files:
                issues.append(
                    LintIssue(
                        file=str(path),
                        line=1,
                        rule="missing-tests",
                        message="Policy lacks matching *_test.rego fixture in directory.",
                    )
                )

    return PolicyLintResult(issues=issues, checked_files=checked)


def lint_roles(path: Path, *, normalize: bool = False) -> RoleLintResult:
    """Lint a YAML role map for RBAC safety issues."""

    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return RoleLintResult(
            [
                LintIssue(
                    file=str(path),
                    line=1,
                    rule="missing-file",
                    message="Roles file not found.",
                )
            ]
        )

    try:
        data = yaml.safe_load(text) or {}
    except yaml.YAMLError as exc:
        return RoleLintResult(
            [
                LintIssue(
                    file=str(path),
                    line=1,
                    rule="invalid-yaml",
                    message=f"Unable to parse roles file: {exc}",
                )
            ]
        )

    issues: list[LintIssue] = []
    normalized_text: str | None = None

    role_entries = _extract_role_entries(data)

    if not role_entries:
        issues.append(
            LintIssue(
                file=str(path),
                line=1,
                rule="no-roles",
                message="No roles defined in roles map.",
                severity="warning",
            )
        )
    else:
        for role in role_entries:
            issues.extend(_lint_role(role, path))

    if normalize and role_entries:
        normalized_data, changed = _normalize_roles(data)
        if changed:
            normalized_text = yaml.safe_dump(
                normalized_data,
                sort_keys=False,
                default_flow_style=False,
            )

    return RoleLintResult(issues=issues, normalized=normalized_text)


def _extract_role_entries(data: object) -> list[dict[str, object]]:
    """Locate role entries within the loaded YAML structure."""

    if isinstance(data, dict):
        for key in ("roles", "role_map", "roleMap"):
            roles = data.get(key)
            if isinstance(roles, list):
                return [role for role in roles if isinstance(role, dict)]
    elif isinstance(data, list):
        return [role for role in data if isinstance(role, dict)]
    return []


def _lint_role(role: dict[str, object], path: Path) -> list[LintIssue]:
    issues: list[LintIssue] = []
    role_name = str(role.get("name", role.get("id", "<unnamed>")))
    permissions = role.get("permissions")

    if not isinstance(permissions, list) or not permissions:
        issues.append(
            LintIssue(
                file=str(path),
                line=1,
                rule="missing-permissions",
                message=f"Role '{role_name}' has no permissions defined.",
            )
        )
        return issues

    seen: dict[tuple[str, tuple[str, ...]], int] = {}
    for idx, perm in enumerate(permissions):
        if not isinstance(perm, dict):
            issues.append(
                LintIssue(
                    file=str(path),
                    line=1,
                    rule="invalid-permission",
                    message=f"Role '{role_name}' permission #{idx + 1} is not a mapping.",
                )
            )
            continue

        resource = str(perm.get("resource", ""))
        actions = perm.get("actions")
        if isinstance(actions, str):
            actions_list = [actions]
        elif isinstance(actions, list):
            actions_list = [str(action) for action in actions]
        else:
            actions_list = []

        if resource == "*":
            issues.append(
                LintIssue(
                    file=str(path),
                    line=1,
                    rule="broad-wildcard",
                    message=f"Role '{role_name}' grants wildcard resource access.",
                )
            )

        if any(action == "*" for action in actions_list):
            issues.append(
                LintIssue(
                    file=str(path),
                    line=1,
                    rule="broad-wildcard",
                    message=f"Role '{role_name}' grants wildcard action access.",
                )
            )

        key = (resource, tuple(sorted(actions_list)))
        if key in seen:
            issues.append(
                LintIssue(
                    file=str(path),
                    line=1,
                    rule="shadowed-permission",
                    message=(
                        f"Role '{role_name}' permission for '{resource}' with actions "
                        f"{sorted(actions_list)} is duplicated."
                    ),
                )
            )
        else:
            seen[key] = idx

        if not actions_list:
            issues.append(
                LintIssue(
                    file=str(path),
                    line=1,
                    rule="missing-actions",
                    message=f"Role '{role_name}' permission for '{resource}' lacks actions.",
                )
            )

    return issues


def _normalize_roles(data: object) -> tuple[object, bool]:
    """Return a normalized copy of the roles structure for deterministic output."""

    changed = False

    if isinstance(data, dict):
        for key in ("roles", "role_map", "roleMap"):
            roles = data.get(key)
            if isinstance(roles, list):
                normalized_roles = []
                for role in roles:
                    if isinstance(role, dict):
                        normalized_role, role_changed = _normalize_role(role)
                        changed = changed or role_changed
                        normalized_roles.append(normalized_role)
                    else:
                        normalized_roles.append(role)
                sorted_roles = sorted(
                    normalized_roles,
                    key=lambda item: (
                        str(item.get("name", item.get("id", "")))
                        if isinstance(item, dict)
                        else str(item)
                    ),
                )
                if roles != sorted_roles:
                    changed = True
                data = {**data, key: sorted_roles}
                break
    elif isinstance(data, list):
        normalized_roles = []
        for role in data:
            if isinstance(role, dict):
                normalized_role, role_changed = _normalize_role(role)
                changed = changed or role_changed
                normalized_roles.append(normalized_role)
            else:
                normalized_roles.append(role)
        sorted_roles = sorted(
            normalized_roles,
            key=lambda item: (
                str(item.get("name", item.get("id", ""))) if isinstance(item, dict) else str(item)
            ),
        )
        if data != sorted_roles:
            changed = True
        data = sorted_roles

    return data, changed


def _normalize_role(role: dict[str, object]) -> tuple[dict[str, object], bool]:
    changed = False
    permissions = role.get("permissions")
    if isinstance(permissions, list):
        normalized_permissions = []
        for perm in permissions:
            if isinstance(perm, dict):
                actions = perm.get("actions")
                if isinstance(actions, list):
                    sorted_actions = sorted(str(action) for action in actions)
                    if actions != sorted_actions:
                        perm = {**perm, "actions": sorted_actions}
                        changed = True
                normalized_permissions.append(perm)
            else:
                normalized_permissions.append(perm)
        sorted_permissions = sorted(
            normalized_permissions,
            key=lambda item: str(item.get("resource", "")) if isinstance(item, dict) else str(item),
        )
        if permissions != sorted_permissions:
            changed = True
        role = {**role, "permissions": sorted_permissions}
    return role, changed
