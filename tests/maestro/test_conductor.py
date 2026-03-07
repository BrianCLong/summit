"""Unit tests for the Maestro Conductor API."""

import pytest
from fastapi.testclient import TestClient

from api.conductor import AGENTS, REVIEWS, WORK_ITEMS
from maestro.app import create_maestro_app


@pytest.fixture(autouse=True)
def clear_in_memory_stores():
    """Fixture to clear the in-memory data stores before each test."""
    AGENTS.clear()
    WORK_ITEMS.clear()
    REVIEWS.clear()


client = TestClient(create_maestro_app())


def test_create_agent():
    """Test creating a new agent."""
    response = client.post(
        "/conductor/agents",
        json={
            "name": "jules-unit-tester",
            "type": "testing",
            "description": "An agent for running unit tests.",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "jules-unit-tester"
    assert data["type"] == "testing"
    assert "id" in data


def test_list_agents():
    """Test listing all agents."""
    response = client.get("/conductor/agents")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_agent():
    """Test getting a specific agent by ID."""
    # First, create an agent to fetch
    create_response = client.post(
        "/conductor/agents",
        json={"name": "agent-to-fetch", "type": "other"},
    )
    agent_id = create_response.json()["id"]

    # Now, fetch it
    response = client.get(f"/conductor/agents/{agent_id}")
    assert response.status_code == 200
    assert response.json()["id"] == agent_id


def test_create_work_item():
    """Test creating a new work item."""
    response = client.post(
        "/conductor/work-items",
        json={
            "github_issue_url": "https://github.com/example/repo/issues/1",
            "title": "Test Work Item",
            "priority": 10,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Work Item"
    assert data["status"] == "pending"
    assert data["priority"] == 10


def test_list_work_items():
    """Test listing all work items."""
    response = client.get("/conductor/work-items")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_update_work_item():
    """Test updating a work item's status."""
    # Create a work item
    create_response = client.post(
        "/conductor/work-items",
        json={
            "github_issue_url": "https://github.com/example/repo/issues/2",
            "title": "Work item to update",
        },
    )
    item_id = create_response.json()["id"]

    # Update its status
    update_response = client.patch(
        f"/conductor/work-items/{item_id}",
        json={"status": "in_progress"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "in_progress"


def test_create_review():
    """Test creating a review for a work item."""
    # Create an agent and a work item
    agent_response = client.post(
        "/conductor/agents", json={"name": "reviewer-agent", "type": "code_review"}
    )
    agent_id = agent_response.json()["id"]
    item_response = client.post(
        "/conductor/work-items",
        json={
            "github_issue_url": "https://github.com/example/repo/issues/3",
            "title": "Item to be reviewed",
        },
    )
    item_id = item_response.json()["id"]

    # Create a review
    review_response = client.post(
        "/conductor/reviews",
        json={
            "work_item_id": item_id,
            "reviewer_agent_id": agent_id,
            "status": "approved",
            "comments": "Looks good to me.",
        },
    )
    assert review_response.status_code == 201
    data = review_response.json()
    assert data["status"] == "approved"
    assert data["comments"] == "Looks good to me."

    # Verify the work item status was updated to 'in_review'
    item_after_review = client.get(f"/conductor/work-items/{item_id}")
    assert item_after_review.json()["status"] == "in_review"


def test_get_reviews_for_work_item():
    """Test getting all reviews for a work item."""
    # Create an agent and a work item
    agent_response = client.post(
        "/conductor/agents", json={"name": "multi-reviewer", "type": "code_review"}
    )
    agent_id = agent_response.json()["id"]
    item_response = client.post(
        "/conductor/work-items",
        json={
            "github_issue_url": "https://github.com/example/repo/issues/4",
            "title": "Item with multiple reviews",
        },
    )
    item_id = item_response.json()["id"]

    # Create two reviews for the same item
    client.post(
        "/conductor/reviews",
        json={
            "work_item_id": item_id,
            "reviewer_agent_id": agent_id,
            "status": "commented",
            "comments": "First comment.",
        },
    )
    client.post(
        "/conductor/reviews",
        json={
            "work_item_id": item_id,
            "reviewer_agent_id": agent_id,
            "status": "approved",
            "comments": "Second comment, approved.",
        },
    )

    # Get the reviews for the work item
    reviews_response = client.get(f"/conductor/work-items/{item_id}/reviews")
    assert reviews_response.status_code == 200
    reviews = reviews_response.json()
    assert len(reviews) == 2
    assert {r["status"] for r in reviews} == {"commented", "approved"}


def setup_routing_environment():
    """Helper function to create agents for routing tests."""
    agents = {
        "jules-bug-fixer": client.post(
            "/conductor/agents", json={"name": "jules-bug-fixer", "type": "code_generation"}
        ).json(),
        "codex-feature-dev": client.post(
            "/conductor/agents", json={"name": "codex-feature-dev", "type": "code_generation"}
        ).json(),
        "atlas-security-scanner": client.post(
            "/conductor/agents",
            json={"name": "atlas-security-scanner", "type": "security_analysis"},
        ).json(),
        "jules-generalist": client.post(
            "/conductor/agents", json={"name": "jules-generalist", "type": "other"}
        ).json(),
    }
    return agents


def test_route_work_item_bug():
    """Test routing a work item with 'bug' in the title."""
    agents = setup_routing_environment()
    item_response = client.post(
        "/conductor/work-items",
        json={"github_issue_url": "issue/5", "title": "Fix critical bug in login"},
    )
    item_id = item_response.json()["id"]

    route_response = client.post(f"/conductor/work-items/route?work_item_id={item_id}")
    assert route_response.status_code == 200
    routed_item = route_response.json()
    assert routed_item["status"] == "assigned"
    assert routed_item["assigned_to_agent_id"] == agents["jules-bug-fixer"]["id"]


def test_route_work_item_feature():
    """Test routing a work item with 'feature' in the title."""
    agents = setup_routing_environment()
    item_response = client.post(
        "/conductor/work-items",
        json={"github_issue_url": "issue/6", "title": "Implement new feature for dashboard"},
    )
    item_id = item_response.json()["id"]

    route_response = client.post(f"/conductor/work-items/route?work_item_id={item_id}")
    assert route_response.status_code == 200
    routed_item = route_response.json()
    assert routed_item["assigned_to_agent_id"] == agents["codex-feature-dev"]["id"]


def test_handoff_work_item():
    """Test handing off a work item to another agent."""
    agents = setup_routing_environment()
    item_response = client.post(
        "/conductor/work-items",
        json={"github_issue_url": "issue/7", "title": "Initial item assignment"},
    )
    item = item_response.json()
    item_id = item["id"]

    # Assign to first agent
    client.patch(
        f"/conductor/work-items/{item_id}",
        json={"assigned_to_agent_id": agents["jules-generalist"]["id"]},
    )

    # Handoff to another agent
    handoff_agent_id = agents["jules-bug-fixer"]["id"]
    handoff_response = client.post(
        f"/conductor/work-items/{item_id}/handoff",
        json={"target_agent_id": handoff_agent_id, "comments": "Escalating to bug fixer."},
    )
    assert handoff_response.status_code == 200
    handed_off_item = handoff_response.json()
    assert handed_off_item["assigned_to_agent_id"] == handoff_agent_id
    assert handed_off_item["status"] == "assigned"
