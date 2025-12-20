"""
Summit Platform Python Client Example

This example demonstrates how to interact with the Summit GraphQL API using Python.

Requirements:
    pip install requests
"""

import requests
import json
from typing import Dict, List, Optional


class SummitClient:
    """Python client for Summit Platform API"""
    
    def __init__(self, base_url: str = "http://localhost:4000", token: Optional[str] = None):
        self.base_url = base_url
        self.graphql_url = f"{base_url}/graphql"
        self.token = token
        self.session = requests.Session()
        
        if token:
            self.session.headers.update({
                "Authorization": f"Bearer {token}"
            })
    
    def login(self, email: str, password: str) -> Dict:
        """
        Authenticate and get JWT token
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Dict with token, refreshToken, and user info
        """
        query = """
        mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
                token
                refreshToken
                user {
                    id
                    email
                    name
                    role
                }
            }
        }
        """
        
        variables = {"email": email, "password": password}
        response = self._execute_query(query, variables, auth_required=False)
        
        if response and "login" in response:
            self.token = response["login"]["token"]
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
        
        return response
    
    def list_entities(self, entity_type: Optional[str] = None, limit: int = 25) -> List[Dict]:
        """
        List entities
        
        Args:
            entity_type: Filter by entity type (e.g., "Person", "Organization")
            limit: Maximum number of results
            
        Returns:
            List of entities
        """
        query = """
        query ListEntities($type: String, $limit: Int) {
            entities(type: $type, limit: $limit) {
                id
                type
                props
                createdAt
                updatedAt
            }
        }
        """
        
        variables = {"type": entity_type, "limit": limit}
        response = self._execute_query(query, variables)
        return response.get("entities", [])
    
    def get_entity(self, entity_id: str) -> Optional[Dict]:
        """
        Get entity by ID
        
        Args:
            entity_id: Entity ID
            
        Returns:
            Entity data or None if not found
        """
        query = """
        query GetEntity($id: ID!) {
            entity(id: $id) {
                id
                type
                props
                relationships {
                    id
                    type
                    from
                    to
                    props
                }
                createdAt
                updatedAt
            }
        }
        """
        
        variables = {"id": entity_id}
        response = self._execute_query(query, variables)
        return response.get("entity")
    
    def create_entity(self, entity_type: str, props: Dict) -> Dict:
        """
        Create new entity
        
        Args:
            entity_type: Type of entity (e.g., "Person", "Organization")
            props: Entity properties
            
        Returns:
            Created entity
        """
        query = """
        mutation CreateEntity($input: EntityInput!) {
            createEntity(input: $input) {
                id
                type
                props
                createdAt
            }
        }
        """
        
        variables = {
            "input": {
                "type": entity_type,
                "props": props
            }
        }
        
        response = self._execute_query(query, variables)
        return response.get("createEntity", {})
    
    def update_entity(self, entity_id: str, props: Dict) -> Dict:
        """
        Update entity properties
        
        Args:
            entity_id: Entity ID
            props: Properties to update
            
        Returns:
            Updated entity
        """
        query = """
        mutation UpdateEntity($id: ID!, $props: JSON!) {
            updateEntity(id: $id, props: $props) {
                id
                type
                props
                updatedAt
            }
        }
        """
        
        variables = {"id": entity_id, "props": props}
        response = self._execute_query(query, variables)
        return response.get("updateEntity", {})
    
    def delete_entity(self, entity_id: str) -> bool:
        """
        Delete entity
        
        Args:
            entity_id: Entity ID
            
        Returns:
            True if deleted successfully
        """
        query = """
        mutation DeleteEntity($id: ID!) {
            deleteEntity(id: $id)
        }
        """
        
        variables = {"id": entity_id}
        response = self._execute_query(query, variables)
        return response.get("deleteEntity", False)
    
    def create_investigation(self, name: str, description: str = "") -> Dict:
        """
        Create new investigation
        
        Args:
            name: Investigation name
            description: Investigation description
            
        Returns:
            Created investigation
        """
        query = """
        mutation CreateInvestigation($input: InvestigationInput!) {
            createInvestigation(input: $input) {
                id
                name
                description
                status
                createdAt
            }
        }
        """
        
        variables = {
            "input": {
                "name": name,
                "description": description
            }
        }
        
        response = self._execute_query(query, variables)
        return response.get("createInvestigation", {})
    
    def list_investigations(self) -> List[Dict]:
        """
        List all investigations
        
        Returns:
            List of investigations
        """
        query = """
        query ListInvestigations {
            investigations {
                id
                name
                description
                status
                createdBy {
                    id
                    name
                }
                createdAt
                updatedAt
            }
        }
        """
        
        response = self._execute_query(query)
        return response.get("investigations", [])
    
    def _execute_query(self, query: str, variables: Optional[Dict] = None, 
                      auth_required: bool = True) -> Dict:
        """
        Execute GraphQL query
        
        Args:
            query: GraphQL query string
            variables: Query variables
            auth_required: Whether authentication is required
            
        Returns:
            Query result data
            
        Raises:
            Exception: If query fails
        """
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
        
        headers = {"Content-Type": "application/json"}
        if auth_required and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        response = requests.post(
            self.graphql_url,
            json=payload,
            headers=headers
        )
        
        response.raise_for_status()
        result = response.json()
        
        if "errors" in result:
            raise Exception(f"GraphQL Error: {result['errors']}")
        
        return result.get("data", {})


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = SummitClient(base_url="http://localhost:4000")
    
    # Login
    print("Logging in...")
    auth_result = client.login(
        email="user@example.com",
        password="password123"
    )
    print(f"Logged in as: {auth_result['login']['user']['name']}")
    
    # Create entity
    print("\nCreating entity...")
    entity = client.create_entity(
        entity_type="Person",
        props={
            "name": "John Doe",
            "email": "john@example.com",
            "age": 30
        }
    )
    print(f"Created entity: {entity['id']}")
    
    # List entities
    print("\nListing entities...")
    entities = client.list_entities(entity_type="Person", limit=10)
    print(f"Found {len(entities)} entities")
    
    # Create investigation
    print("\nCreating investigation...")
    investigation = client.create_investigation(
        name="Test Investigation",
        description="Example investigation"
    )
    print(f"Created investigation: {investigation['id']}")
    
    # List investigations
    print("\nListing investigations...")
    investigations = client.list_investigations()
    print(f"Found {len(investigations)} investigations")
