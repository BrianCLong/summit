"""
Custom Ingestion Pipeline Example

This script demonstrates how to ingest data from an external JSON API
and push it into Summit using the GraphQL API.
"""

import requests
import os
import json

# Configuration
API_URL = os.getenv("SUMMIT_API_URL", "http://localhost:4000/graphql")
API_TOKEN = os.getenv("SUMMIT_API_TOKEN", "your-token-here")
SOURCE_URL = "https://api.example.com/data"

def fetch_data():
    """Fetch data from external source."""
    # response = requests.get(SOURCE_URL)
    # response.raise_for_status()
    # return response.json()

    # Mock data for demonstration
    return [
        {"id": "1", "full_name": "Alice Smith", "email": "alice@example.com"},
        {"id": "2", "full_name": "Bob Jones", "email": "bob@example.com"}
    ]

def create_entity(record):
    """Create entity via GraphQL mutation."""
    query = """
    mutation CreateEntity($input: EntityInput!) {
      createEntity(input: $input) {
        id
        type
      }
    }
    """

    variables = {
        "input": {
            "type": "Person",
            "props": {
                "name": record.get("full_name"),
                "email": record.get("email"),
                "source_id": record.get("id")
            }
        }
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_TOKEN}"
    }

    try:
        response = requests.post(
            API_URL,
            json={"query": query, "variables": variables},
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        result = response.json()

        if "errors" in result:
            print(f"GraphQL Errors: {result['errors']}")
            return None

        return result["data"]["createEntity"]

    except Exception as e:
        print(f"Request failed: {e}")
        return None

def main():
    print(f"Targeting Summit API at: {API_URL}")
    print("Fetching data...")
    data = fetch_data()

    print(f"Ingesting {len(data)} records...")
    for record in data:
        entity = create_entity(record)
        if entity:
            print(f"Created entity: {entity['id']}")
        else:
            print("Failed to create entity")

if __name__ == "__main__":
    main()
