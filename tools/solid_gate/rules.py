import os
import re
from typing import Callable, List, Optional, Set

from .schema import Finding

# Configuration
TEST_PATTERNS = [
    r"__tests__/",
    r"tests/",
    r"\.test\.(js|ts|jsx|tsx)$",
    r"\.spec\.(js|ts|jsx|tsx)$",
    r"test_.*\.py$",
    r"_test\.go$"
]

SRC_EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs'}

def is_test_file(filepath: str) -> bool:
    for pattern in TEST_PATTERNS:
        if re.search(pattern, filepath):
            return True
    return False

def is_source_file(filepath: str) -> bool:
    _, ext = os.path.splitext(filepath)
    return ext in SRC_EXTENSIONS

def check_tests_touched(changed_files: list[str]) -> list[Finding]:
    findings = []
    has_src_change = any(is_source_file(f) and not is_test_file(f) for f in changed_files)
    has_test_change = any(is_test_file(f) for f in changed_files)

    if has_src_change and not has_test_change:
        findings.append(Finding(
            rule_id="TESTS_NOT_TOUCHED",
            severity="warn",
            message="Source code modified but no tests were changed."
        ))
    return findings

def check_proto_pollution(filepath: str, content: str) -> list[Finding]:
    findings = []
    if not (filepath.endswith('.ts') or filepath.endswith('.js') or filepath.endswith('.tsx') or filepath.endswith('.jsx')):
        return findings

    lines = content.splitlines()
    for i, line in enumerate(lines):
        # Heuristic: look for ' in ' but ignore 'for (... in ...)'
        if " in " in line and "for (" not in line:
            clean_line = line.split("//")[0]
            # Match: (word or quoted string) + space + in + space + word
            # simplistic regex:  (\w+|['"][^'"]+['"]) \s+ in \s+ \w+
            if re.search(r"(\w+|['\"][^'\"]+['\"])\s+in\s+\w+", clean_line):
                 findings.append(Finding(
                    rule_id="PROTO_POLLUTION_RISK",
                    severity="warn",
                    message="Potential prototype pollution risk: detected 'in' operator for membership check. Prefer Object.hasOwn() or Map.",
                    path=filepath,
                    line=i + 1
                ))
    return findings

def check_file_smells(filepath: str, content: str) -> list[Finding]:
    findings = []
    lines = content.splitlines()

    # Large file check
    if len(lines) > 300: # Arbitrary MWS threshold
         findings.append(Finding(
            rule_id="SMELL_LARGE_FILE",
            severity="info",
            message=f"File exceeds 300 lines ({len(lines)} lines). Consider splitting.",
            path=filepath
        ))

    return findings

def check_rules(changed_files: list[str], file_reader: Callable[[str], str]) -> list[Finding]:
    all_findings = []

    # 1. Global checks
    all_findings.extend(check_tests_touched(changed_files))

    # 2. File-level checks
    for filepath in changed_files:
        # Removed os.path.exists check to allow mocking easier, relying on file_reader
        content = file_reader(filepath)
        if not content:
            continue

        all_findings.extend(check_proto_pollution(filepath, content))
        all_findings.extend(check_file_smells(filepath, content))

    return all_findings
