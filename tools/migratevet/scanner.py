"""Core scanning utilities for the MigrateVet CLI."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable, List

from . import postgres_rules
from .models import FileContext, Issue, Statement


SUPPORTED_DIALECTS = {"postgres"}


def scan_directory(root: Path, dialect: str) -> List[Issue]:
    """Scan all SQL files under ``root`` for the given dialect."""
    if dialect not in SUPPORTED_DIALECTS:
        raise ValueError(f"Unsupported dialect '{dialect}'. Supported dialects: {sorted(SUPPORTED_DIALECTS)}")

    issues: List[Issue] = []
    for path in sorted(root.rglob("*.sql")):
        issues.extend(scan_file(path, dialect))
    return issues


def scan_file(path: Path, dialect: str) -> List[Issue]:
    """Scan an individual SQL file."""
    text = path.read_text(encoding="utf-8")
    sanitized = _strip_sql_comments(text)
    statements = list(_extract_statements(sanitized))
    context = FileContext(path=path, source_text=text, sanitized_text=sanitized, line_offsets=_compute_line_offsets(text))

    if dialect == "postgres":
        return postgres_rules.evaluate(statements, context)
    raise ValueError(f"Unsupported dialect '{dialect}'")


def _compute_line_offsets(text: str) -> List[int]:
    offsets = [0]
    for idx, char in enumerate(text):
        if char == "\n":
            offsets.append(idx + 1)
    return offsets


def _strip_sql_comments(text: str) -> str:
    """Return ``text`` with SQL comments replaced by spaces, preserving length."""
    result: List[str] = []
    length = len(text)
    i = 0
    in_single = False
    in_double = False
    dollar_tag: str | None = None
    in_block_comment = False

    while i < length:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < length else ""

        if in_block_comment:
            if ch == "*" and nxt == "/":
                result.append("  ")
                i += 2
                in_block_comment = False
            else:
                result.append("\n" if ch == "\n" else " ")
                i += 1
            continue

        if dollar_tag is not None:
            if ch == "$" and text.startswith(dollar_tag, i):
                tag_len = len(dollar_tag)
                result.append(text[i : i + tag_len])
                i += tag_len
                dollar_tag = None
            else:
                result.append(ch)
                i += 1
            continue

        if in_single:
            result.append(ch)
            i += 1
            if ch == "'":
                if nxt == "'":
                    result.append("'")
                    i += 1
                else:
                    in_single = False
            continue

        if in_double:
            result.append(ch)
            i += 1
            if ch == '"':
                in_double = False
            continue

        # Not in any quoted section.
        if ch == "-" and nxt == "-":
            # Single-line comment.
            while i < length and text[i] != "\n":
                result.append(" ")
                i += 1
            if i < length:
                result.append("\n")
                i += 1
            continue

        if ch == "/" and nxt == "*":
            in_block_comment = True
            result.append("  ")
            i += 2
            continue

        if ch == "'":
            in_single = True
            result.append(ch)
            i += 1
            continue

        if ch == '"':
            in_double = True
            result.append(ch)
            i += 1
            continue

        if ch == "$":
            tag_end = text.find("$", i + 1)
            if tag_end != -1:
                tag = text[i : tag_end + 1]
                # Ensure the tag is alphanumeric or underscore.
                if all(c.isalnum() or c == "_" for c in tag[1:-1]):
                    dollar_tag = tag
                    result.append(tag)
                    i += len(tag)
                    continue
            result.append(ch)
            i += 1
            continue

        result.append(ch)
        i += 1

    return "".join(result)


def _extract_statements(sanitized_text: str) -> Iterable[Statement]:
    start = 0
    in_single = False
    in_double = False
    dollar_tag: str | None = None
    length = len(sanitized_text)

    for idx, ch in enumerate(sanitized_text):
        if dollar_tag is not None:
            if ch == "$" and sanitized_text.startswith(dollar_tag, idx):
                dollar_tag = None
            continue

        if in_single:
            if ch == "'":
                nxt = sanitized_text[idx + 1] if idx + 1 < length else ""
                if nxt == "'":
                    continue
                in_single = False
            continue

        if in_double:
            if ch == '"':
                in_double = False
            continue

        if ch == "'":
            in_single = True
            continue

        if ch == '"':
            in_double = True
            continue

        if ch == "$":
            tag_end = _find_dollar_tag_end(sanitized_text, idx)
            if tag_end is not None:
                dollar_tag = sanitized_text[idx : tag_end + 1]
            continue

        if ch == ";":
            segment = sanitized_text[start : idx + 1]
            if segment.strip():
                upper = segment.upper()
                yield Statement(text=segment, upper=upper, start=start, end=idx + 1)
            start = idx + 1

    if start < length:
        segment = sanitized_text[start:length]
        if segment.strip():
            upper = segment.upper()
            yield Statement(text=segment, upper=upper, start=start, end=length)


def _find_dollar_tag_end(text: str, start: int) -> int | None:
    tag_end = text.find("$", start + 1)
    if tag_end == -1:
        return None
    tag = text[start : tag_end + 1]
    if not tag or tag.count("$") != 2:
        return None
    if all(c.isalnum() or c == "_" for c in tag[1:-1]):
        return tag_end
    return None
