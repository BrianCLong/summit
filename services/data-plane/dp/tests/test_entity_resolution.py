"""Tests for entity resolution / identity stitching."""
from __future__ import annotations

from dp.app.entity_resolution import EntityResolver, EntityStore
from dp.app.models import CanonicalEvent, EntityType


def _pr_event(number: int, author: str, repo: str = "acme/api") -> CanonicalEvent:
    return CanonicalEvent(
        event_type="pr.opened.v1",
        tenant_id="acme",
        source_service="test",
        data={
            "record_type": "pull_request",
            "source_id": str(number),
            "number": number,
            "title": f"PR #{number}",
            "state": "open",
            "author_login": author,
            "author_id": hash(author),
            "repo": repo,
        },
    )


def test_resolver_extracts_person_and_repo():
    store = EntityStore()
    resolver = EntityResolver(store=store)

    event = _pr_event(1, "alice")
    entities = resolver.process(event)

    types = {e.entity_type for e in entities}
    assert EntityType.PERSON in types
    assert EntityType.REPOSITORY in types
    assert EntityType.PULL_REQUEST in types


def test_same_author_across_events_is_single_entity():
    store = EntityStore()
    resolver = EntityResolver(store=store)

    resolver.process(_pr_event(1, "alice"))
    resolver.process(_pr_event(2, "alice"))

    people = [e for e in store.get_all() if e.entity_type == EntityType.PERSON]
    assert len(people) == 1
    person = people[0]
    assert len(person.source_ids) == 2


def test_different_authors_are_separate_entities():
    store = EntityStore()
    resolver = EntityResolver(store=store)

    resolver.process(_pr_event(1, "alice"))
    resolver.process(_pr_event(2, "bob"))

    people = [e for e in store.get_all() if e.entity_type == EntityType.PERSON]
    assert len(people) == 2


def test_store_find_by_type():
    store = EntityStore()
    resolver = EntityResolver(store=store)

    resolver.process(_pr_event(1, "alice", repo="acme/api"))
    resolver.process(_pr_event(2, "bob", repo="acme/api"))

    repos = store.find(entity_type=EntityType.REPOSITORY)
    assert len(repos) == 1
    assert repos[0].canonical_name == "acme/api"


def test_store_find_by_name_contains():
    store = EntityStore()
    resolver = EntityResolver(store=store)

    resolver.process(_pr_event(1, "alice", repo="acme/api"))
    resolver.process(_pr_event(2, "bob", repo="acme/payments"))

    results = store.find(name_contains="payments")
    assert len(results) == 1
    assert "payments" in results[0].canonical_name


def test_evidence_id_attached_to_entity():
    store = EntityStore()
    resolver = EntityResolver(store=store)

    event = _pr_event(1, "alice")
    resolver.process(event, evidence_id="eid.dp.test.00000000.abc.def")

    alice = next(e for e in store.get_all() if e.entity_type == EntityType.PERSON)
    assert "eid.dp.test.00000000.abc.def" in alice.evidence_ids
