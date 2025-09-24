from __future__ import annotations

import math
import re
from collections import deque
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


SENSITIVE_FIELDS = {"ssn", "salary"}
WRITE_KEYWORDS = {"CREATE", "MERGE", "DELETE", "DROP", "REMOVE", "SET"}


class NLQEngineError(Exception):
    """Base error for NLQ engine failures."""


class NLQSecurityError(NLQEngineError):
    """Raised when a query violates sandbox safety rules."""


@dataclass
class TranslationResult:
    query: str
    cost: int
    warnings: List[str]
    labels: List[str]
    fields: List[str]
    operation: str
    parameters: Dict[str, Any]
    dialect: str


@dataclass
class SandboxResult:
    rows: List[Dict[str, Any]]
    actual_count: int
    warnings: List[str]
    truncated: bool
    cost: int
    labels: List[str]
    fields: List[str]


@dataclass
class ExplainResult:
    plan: Dict[str, Any]
    warnings: List[str]
    cost: int
    labels: List[str]
    fields: List[str]


class GraphSandbox:
    """Deterministic in-memory graph used for sandbox previews."""

    def __init__(self) -> None:
        self.people: Dict[str, Dict[str, Any]] = {
            "Alice": {
                "title": "Security Analyst",
                "ssn": "111-11-1111",
                "friends": ["Bob", "Carol"],
                "companies": ["GraphCorp"],
                "teams": ["Security"],
            },
            "Bob": {
                "title": "Graph Engineer",
                "ssn": "222-22-2222",
                "friends": ["Alice", "Carol"],
                "companies": ["GraphCorp"],
                "teams": ["Security"],
            },
            "Carol": {
                "title": "Data Scientist",
                "ssn": "333-33-3333",
                "friends": ["Alice", "Eve"],
                "companies": ["DataSys"],
                "teams": ["Analytics"],
            },
            "Dave": {
                "title": "Operations Lead",
                "ssn": "444-44-4444",
                "friends": ["Eve"],
                "companies": ["OpsCore"],
                "teams": ["Operations"],
            },
            "Eve": {
                "title": "Incident Responder",
                "ssn": "555-55-5555",
                "friends": ["Carol", "Dave"],
                "companies": ["GraphCorp"],
                "teams": ["Security"],
            },
        }
        self.teams: Dict[str, Dict[str, Any]] = {
            "Security": {"collaborates_with": ["Analytics", "Operations"]},
            "Analytics": {"collaborates_with": ["Security"]},
            "Operations": {"collaborates_with": ["Security"]},
        }
        self.emails: List[Dict[str, str]] = [
            {"sender": "Carol", "recipient": "Dave", "subject": "Quarterly report"},
            {"sender": "Carol", "recipient": "Dave", "subject": "Security review"},
            {"sender": "Alice", "recipient": "Bob", "subject": "Graph metrics"},
        ]

    def execute(self, operation: str, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        if operation == "friends":
            return self._friends(parameters["name"], parameters["depth"])
        if operation == "companies":
            return self._companies(parameters["name"], parameters["depth"])
        if operation == "shortest_path":
            return self._shortest_path(parameters["start"], parameters["end"], parameters["max_depth"])
        if operation == "email_count":
            return self._email_count(parameters["sender"], parameters["recipient"])
        if operation == "team_collaboration":
            return self._team_collaboration(parameters["team"])
        raise NLQEngineError(f"Unsupported sandbox operation '{operation}'")

    def count(self, operation: str, parameters: Dict[str, Any]) -> int:
        return len(self.execute(operation, parameters))

    def _person_record(self, name: str) -> Dict[str, Any]:
        data = self.people.get(name, {})
        return {
            "name": name,
            "title": data.get("title"),
            "ssn": data.get("ssn"),
        }

    def _friends(self, name: str, depth: int) -> List[Dict[str, Any]]:
        visited = {name}
        queue: deque[tuple[str, int]] = deque([(name, 0)])
        results: List[Dict[str, Any]] = []
        while queue:
            current, dist = queue.popleft()
            if dist >= depth:
                continue
            for friend in sorted(self.people.get(current, {}).get("friends", [])):
                if friend in visited:
                    continue
                visited.add(friend)
                record = self._person_record(friend)
                record["hops"] = dist + 1
                results.append(record)
                queue.append((friend, dist + 1))
        results.sort(key=lambda row: (row["hops"], row["name"]))
        return results

    def _companies(self, name: str, hops: int) -> List[Dict[str, Any]]:
        visited = {name}
        queue: deque[tuple[str, int]] = deque([(name, 0)])
        companies: Dict[str, int] = {}
        while queue:
            current, dist = queue.popleft()
            if dist > hops:
                continue
            for company in self.people.get(current, {}).get("companies", []):
                companies[company] = min(companies.get(company, dist), dist)
            if dist == hops:
                continue
            for friend in sorted(self.people.get(current, {}).get("friends", [])):
                if friend in visited:
                    continue
                visited.add(friend)
                queue.append((friend, dist + 1))
        rows = [{"company": company, "hops": distance} for company, distance in companies.items()]
        rows.sort(key=lambda row: (row["hops"], row["company"]))
        return rows

    def _shortest_path(self, start: str, end: str, max_depth: int) -> List[Dict[str, Any]]:
        queue: deque[tuple[str, List[str]]] = deque([(start, [start])])
        visited = {start}
        while queue:
            current, path = queue.popleft()
            if current == end:
                return [{"path": path, "steps": len(path) - 1}]
            if len(path) - 1 >= max_depth:
                continue
            for friend in sorted(self.people.get(current, {}).get("friends", [])):
                if friend in visited:
                    continue
                visited.add(friend)
                queue.append((friend, path + [friend]))
        return []

    def _email_count(self, sender: str, recipient: str) -> List[Dict[str, Any]]:
        count = sum(1 for email in self.emails if email["sender"] == sender and email["recipient"] == recipient)
        return [{"sender": sender, "recipient": recipient, "count": count}]

    def _team_collaboration(self, team: str) -> List[Dict[str, Any]]:
        partners = sorted(self.teams.get(team, {}).get("collaborates_with", []))
        return [{"team": partner, "relationship": "COLLABORATES_WITH"} for partner in partners]


class NLQEngine:
    """Translate natural language graph questions to safe Cypher/SQL."""

    def __init__(self, depth_limit: int = 3, row_cap: int = 50) -> None:
        self.depth_limit = depth_limit
        self.row_cap = row_cap
        self._sandbox = GraphSandbox()
        self._recent: Dict[str, TranslationResult] = {}

    def translate(self, question: str, dialect: str = "cypher", max_depth: Optional[int] = None) -> TranslationResult:
        normalized = question.strip()
        if not normalized:
            raise NLQEngineError("Question cannot be empty")
        effective_depth = self.depth_limit if max_depth is None else min(self.depth_limit, max_depth)
        lowered = normalized.lower()
        if "shortest path" in lowered:
            translation = self._translate_path(normalized, effective_depth, dialect)
        elif "email" in lowered and ("count" in lowered or "how many" in lowered):
            translation = self._translate_email_count(normalized, dialect)
        elif "companies" in lowered and ("connected" in lowered or "linked" in lowered):
            translation = self._translate_companies(normalized, effective_depth, dialect)
        elif "team" in lowered and ("collaborate" in lowered or "partner" in lowered or "working with" in lowered):
            translation = self._translate_team_collaboration(normalized, dialect)
        elif "friend" in lowered or "connection" in lowered:
            translation = self._translate_friends(normalized, effective_depth, dialect)
        else:
            raise NLQEngineError("Unable to translate question")
        self._recent[translation.query] = translation
        return translation

    def run_sandbox(self, query: str, limit: Optional[int] = None) -> SandboxResult:
        self._ensure_read_only(query)
        translation = self._recent.get(query) or self._infer_from_query(query)
        if translation is None:
            raise NLQEngineError("Query not recognized for sandbox execution")
        normalized_limit = self._normalize_limit(limit)
        warnings = list(translation.warnings)
        if limit is not None and limit > self.row_cap:
            warnings.append(f"Requested limit {limit} exceeds sandbox cap {self.row_cap}; truncated.")
        rows = self._sandbox.execute(translation.operation, translation.parameters)
        actual_count = len(rows)
        truncated = actual_count > normalized_limit
        preview_rows = rows[:normalized_limit]
        sanitized_rows: List[Dict[str, Any]] = []
        redacted_fields: List[str] = []
        for row in preview_rows:
            sanitized, redactions = self._redact_row(row)
            sanitized_rows.append(sanitized)
            redacted_fields.extend(redactions)
        if redacted_fields:
            unique = sorted(set(redacted_fields))
            warnings.append("Policy redacted fields: " + ", ".join(unique))
        return SandboxResult(
            rows=sanitized_rows,
            actual_count=actual_count,
            warnings=warnings,
            truncated=truncated,
            cost=translation.cost,
            labels=translation.labels,
            fields=translation.fields,
        )

    def explain(self, query: str) -> ExplainResult:
        translation = self._recent.get(query) or self._infer_from_query(query)
        if translation is None:
            raise NLQEngineError("Query not recognized for explain plan")
        plan = {
            "operation": translation.operation,
            "parameters": translation.parameters,
            "estimated_rows": translation.cost,
            "dialect": translation.dialect,
            "row_cap": self.row_cap,
        }
        return ExplainResult(
            plan=plan,
            warnings=list(translation.warnings),
            cost=translation.cost,
            labels=translation.labels,
            fields=translation.fields,
        )

    def _translate_friends(self, question: str, depth_limit: int, dialect: str) -> TranslationResult:
        name_match = re.search(r"friends? of ([A-Za-z]+)", question, re.IGNORECASE)
        if not name_match:
            name_match = re.search(r"connections? for ([A-Za-z]+)", question, re.IGNORECASE)
        if not name_match:
            raise NLQEngineError("Could not identify subject in question")
        name = self._normalize_entity(name_match.group(1))
        requested_depth = self._extract_depth(question) or 1
        applied_depth = max(1, min(requested_depth, depth_limit))
        warnings: List[str] = []
        if requested_depth > depth_limit:
            warnings.append(
                f"Requested depth {requested_depth} exceeds limit {depth_limit}; using depth {applied_depth}."
            )
        limit_clause = min(25, self.row_cap)
        query = (
            f"MATCH (person:Person {{name: '{name}'}})-[:FRIEND*1..{applied_depth}]->(friend:Person)\n"
            "WITH person, friend, length(shortestPath((person)-[:FRIEND*]->(friend))) AS hops\n"
            "RETURN DISTINCT friend.name AS name, friend.title AS title, hops\n"
            "ORDER BY hops ASC, name ASC\n"
            f"LIMIT {limit_clause}"
        )
        parameters = {"name": name, "depth": applied_depth}
        cost = self._estimate("friends", parameters)
        return TranslationResult(
            query=query,
            cost=cost,
            warnings=warnings,
            labels=["Person"],
            fields=["name", "title", "hops"],
            operation="friends",
            parameters=parameters,
            dialect=dialect,
        )

    def _translate_companies(self, question: str, depth_limit: int, dialect: str) -> TranslationResult:
        match = re.search(r"companies? (?:connected|linked) to ([A-Za-z]+)", question, re.IGNORECASE)
        if not match:
            raise NLQEngineError("Could not identify subject in question")
        name = self._normalize_entity(match.group(1))
        requested_depth = self._extract_depth(question) or 2
        applied_depth = max(0, min(requested_depth, depth_limit))
        warnings: List[str] = []
        if requested_depth > depth_limit:
            warnings.append(
                f"Requested depth {requested_depth} exceeds limit {depth_limit}; using depth {applied_depth}."
            )
        limit_clause = min(25, self.row_cap)
        query = (
            f"MATCH (person:Person {{name: '{name}'}})-[:FRIEND*0..{applied_depth}]->(peer:Person)\n"
            "MATCH (peer)-[:WORKS_AT]->(company:Company)\n"
            "WITH DISTINCT company, min(length(shortestPath((person)-[:FRIEND*]->(peer)))) AS hops\n"
            "RETURN company.name AS company, hops\n"
            "ORDER BY hops ASC, company ASC\n"
            f"LIMIT {limit_clause}"
        )
        parameters = {"name": name, "depth": applied_depth}
        cost = self._estimate("companies", parameters)
        return TranslationResult(
            query=query,
            cost=cost,
            warnings=warnings,
            labels=["Person", "Company"],
            fields=["company", "hops"],
            operation="companies",
            parameters=parameters,
            dialect=dialect,
        )

    def _translate_email_count(self, question: str, dialect: str) -> TranslationResult:
        sender_match = re.search(r"emails? (?:from|sent by) ([A-Za-z]+)", question, re.IGNORECASE)
        recipient_match = re.search(r"to ([A-Za-z]+)", question, re.IGNORECASE)
        if not sender_match or not recipient_match:
            raise NLQEngineError("Could not identify sender and recipient")
        sender = self._normalize_entity(sender_match.group(1))
        recipient = self._normalize_entity(recipient_match.group(1))
        if dialect.lower() == "sql":
            query = (
                "SELECT\n"
                f"  '{sender}' AS sender,\n"
                f"  '{recipient}' AS recipient,\n"
                "  COUNT(*) AS count\n"
                "FROM emails\n"
                f"WHERE sender = '{sender}' AND recipient = '{recipient}';"
            )
        else:
            query = (
                f"MATCH (sender:Person {{name: '{sender}'}})-[r:EMAILED]->(recipient:Person {{name: '{recipient}'}})\n"
                "RETURN sender.name AS sender, recipient.name AS recipient, count(r) AS count"
            )
            dialect = "cypher"
        parameters = {"sender": sender, "recipient": recipient}
        cost = self._estimate("email_count", parameters)
        return TranslationResult(
            query=query,
            cost=cost,
            warnings=[],
            labels=["Email"],
            fields=["sender", "recipient", "count"],
            operation="email_count",
            parameters=parameters,
            dialect=dialect,
        )

    def _translate_team_collaboration(self, question: str, dialect: str) -> TranslationResult:
        match = re.search(
            r"teams? (?:that )?(?:collaborate|work with|partner with) ([A-Za-z ]+)", question, re.IGNORECASE
        )
        if not match:
            raise NLQEngineError("Could not identify team name")
        team = self._normalize_entity(match.group(1))
        limit_clause = min(25, self.row_cap)
        query = (
            f"MATCH (team:Team {{name: '{team}'}})-[:COLLABORATES_WITH]->(partner:Team)\n"
            "RETURN DISTINCT partner.name AS team, 'COLLABORATES_WITH' AS relationship\n"
            "ORDER BY team ASC\n"
            f"LIMIT {limit_clause}"
        )
        parameters = {"team": team}
        cost = self._estimate("team_collaboration", parameters)
        return TranslationResult(
            query=query,
            cost=cost,
            warnings=[],
            labels=["Team"],
            fields=["team", "relationship"],
            operation="team_collaboration",
            parameters=parameters,
            dialect=dialect,
        )

    def _translate_path(self, question: str, depth_limit: int, dialect: str) -> TranslationResult:
        match = re.search(r"between ([A-Za-z]+) and ([A-Za-z]+)", question, re.IGNORECASE)
        if not match:
            raise NLQEngineError("Could not identify start and end nodes")
        start = self._normalize_entity(match.group(1))
        end = self._normalize_entity(match.group(2))
        requested_depth = self._extract_depth(question) or depth_limit
        applied_depth = max(1, min(requested_depth, depth_limit))
        warnings: List[str] = []
        if requested_depth > depth_limit:
            warnings.append(
                f"Requested depth {requested_depth} exceeds limit {depth_limit}; using depth {applied_depth}."
            )
        query = (
            f"MATCH path = shortestPath((start:Person {{name: '{start}'}})-[:FRIEND*..{applied_depth}]->(end:Person {{name: '{end}'}}))\n"
            "RETURN [node IN nodes(path) | node.name] AS path, length(path) AS steps\n"
            "LIMIT 1"
        )
        parameters = {"start": start, "end": end, "max_depth": applied_depth}
        cost = self._estimate("shortest_path", parameters)
        return TranslationResult(
            query=query,
            cost=cost,
            warnings=warnings,
            labels=["Person"],
            fields=["path", "steps"],
            operation="shortest_path",
            parameters=parameters,
            dialect=dialect,
        )

    def _estimate(self, operation: str, parameters: Dict[str, Any]) -> int:
        actual_rows = self._sandbox.count(operation, parameters)
        if actual_rows == 0:
            return 0
        estimate = max(1, int(round(actual_rows * 1.05)))
        return min(estimate, self.row_cap)

    def _ensure_read_only(self, query: str) -> None:
        upper = query.upper()
        if any(keyword in upper for keyword in WRITE_KEYWORDS):
            raise NLQSecurityError("Sandbox only supports read-only queries")

    def _normalize_limit(self, limit: Optional[int]) -> int:
        if limit is None or limit <= 0:
            return min(25, self.row_cap)
        return min(limit, self.row_cap)

    def _redact_row(self, row: Dict[str, Any]) -> tuple[Dict[str, Any], List[str]]:
        sanitized: Dict[str, Any] = {}
        redacted: List[str] = []
        for key, value in row.items():
            if key in SENSITIVE_FIELDS:
                redacted.append(key)
                continue
            sanitized[key] = value
        return sanitized, redacted

    def _infer_from_query(self, query: str) -> Optional[TranslationResult]:
        stripped = query.strip()
        if not stripped:
            return None
        dialect = "sql" if stripped.upper().startswith("SELECT") else "cypher"
        if "[:FRIEND" in stripped.upper() and "RETURN DISTINCT friend.name" in stripped:
            name_match = re.search(r"name: '([^']+)'", stripped)
            depth_match = re.search(r":FRIEND\*1\.\.(\d+)", stripped)
            if name_match and depth_match:
                parameters = {"name": name_match.group(1), "depth": int(depth_match.group(1))}
                translation = TranslationResult(
                    query=query,
                    cost=self._estimate("friends", parameters),
                    warnings=[],
                    labels=["Person"],
                    fields=["name", "title", "hops"],
                    operation="friends",
                    parameters=parameters,
                    dialect="cypher",
                )
                self._recent[query] = translation
                return translation
        if "WORKS_AT" in stripped.upper():
            name_match = re.search(r"name: '([^']+)'", stripped)
            depth_match = re.search(r":FRIEND\*0\.\.(\d+)", stripped)
            if name_match and depth_match:
                parameters = {"name": name_match.group(1), "depth": int(depth_match.group(1))}
                translation = TranslationResult(
                    query=query,
                    cost=self._estimate("companies", parameters),
                    warnings=[],
                    labels=["Person", "Company"],
                    fields=["company", "hops"],
                    operation="companies",
                    parameters=parameters,
                    dialect="cypher",
                )
                self._recent[query] = translation
                return translation
        if "SHORTESTPATH" in stripped.upper():
            names = re.findall(r"name: '([^']+)'", stripped)
            depth_match = re.search(r":FRIEND\*\.\.(\d+)", stripped)
            if len(names) >= 2 and depth_match:
                parameters = {
                    "start": names[0],
                    "end": names[-1],
                    "max_depth": max(1, int(depth_match.group(1))),
                }
                translation = TranslationResult(
                    query=query,
                    cost=self._estimate("shortest_path", parameters),
                    warnings=[],
                    labels=["Person"],
                    fields=["path", "steps"],
                    operation="shortest_path",
                    parameters=parameters,
                    dialect="cypher",
                )
                self._recent[query] = translation
                return translation
        if stripped.upper().startswith("SELECT"):
            sender_match = re.search(r"WHERE sender = '([^']+)'", stripped)
            recipient_match = re.search(r"recipient = '([^']+)'", stripped)
            if sender_match and recipient_match:
                parameters = {"sender": sender_match.group(1), "recipient": recipient_match.group(1)}
                translation = TranslationResult(
                    query=query,
                    cost=self._estimate("email_count", parameters),
                    warnings=[],
                    labels=["Email"],
                    fields=["sender", "recipient", "count"],
                    operation="email_count",
                    parameters=parameters,
                    dialect="sql",
                )
                self._recent[query] = translation
                return translation
        if "COLLABORATES_WITH" in stripped.upper():
            match = re.search(r"Team \{name: '([^']+)'\}", stripped)
            if match:
                parameters = {"team": match.group(1)}
                translation = TranslationResult(
                    query=query,
                    cost=self._estimate("team_collaboration", parameters),
                    warnings=[],
                    labels=["Team"],
                    fields=["team", "relationship"],
                    operation="team_collaboration",
                    parameters=parameters,
                    dialect="cypher",
                )
                self._recent[query] = translation
                return translation
        return None

    def _extract_depth(self, question: str) -> Optional[int]:
        match = re.search(r"(\d+)\s*(?:hop|hops|step|steps|degree|degrees)", question, re.IGNORECASE)
        if match:
            return int(match.group(1))
        within_match = re.search(r"within\s+(\d+)", question, re.IGNORECASE)
        if within_match:
            return int(within_match.group(1))
        return None

    def _normalize_entity(self, token: str) -> str:
        cleaned = token.strip().strip("?.,")
        if not cleaned:
            return cleaned
        return cleaned[0].upper() + cleaned[1:].lower()


def is_nlq_query_safe(query: str) -> bool:
    """Convenience helper used in tests."""
    upper = query.upper()
    return not any(keyword in upper for keyword in WRITE_KEYWORDS)
