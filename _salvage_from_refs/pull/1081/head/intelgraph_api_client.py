import json
import logging
import time

import requests
from jsonschema import ValidationError, validate
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# JSON Schemas for IntelGraph API payloads
NARRATIVE_DETECT_REQUEST_SCHEMA = {
    "type": "object",
    "properties": {
        "text": {"type": "string"},
        "source": {"type": "string"},
        "region": {"type": "string"},
        "signal_score": {"type": "number"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["text", "source", "region", "signal_score", "tags"],
}

ENTITY_LINK_REQUEST_SCHEMA = {
    "type": "object",
    "properties": {
        "narrative_id": {"type": "string"},
        "entities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "type": {"type": "string"},
                    "confidence": {"type": "number"},
                },
                "required": ["name", "type", "confidence"],
            },
        },
        "relationships": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source": {"type": "string"},
                    "target": {"type": "string"},
                    "relation": {"type": "string"},
                },
                "required": ["source", "target", "relation"],
            },
        },
    },
    "required": ["narrative_id", "entities", "relationships"],
}

COUNTER_MESSAGE_PUBLISH_REQUEST_SCHEMA = {
    "type": "object",
    "properties": {
        "narrative_id": {"type": "string"},
        "message": {"type": "string"},
        "channels": {"type": "array", "items": {"type": "string"}},
        "intent": {"type": "string"},
        "language": {"type": "string"},
    },
    "required": ["narrative_id", "message", "channels", "intent", "language"],
}


class IntelGraphAPIClient:
    """
    A client for interacting with the IntelGraph REST API (v2.1).
    Handles OAuth2 client credentials authentication and provides methods
    for critical endpoints.
    """

    def __init__(self, config: dict):
        self.config = config
        self.base_url = config["intelgraph_api_base_url"]
        self.token_url = config["oauth_token_url"]
        self.client_id = config["oauth_client_id"]
        self.client_secret = config["oauth_client_secret"]
        self.access_token = None
        self.token_expires_at = 0
        self._get_access_token()

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=(
            retry_if_exception_type(requests.exceptions.RequestException)
            | retry_if_exception_type(requests.exceptions.HTTPError)
        ),
        reraise=True,
    )
    def _get_access_token(self):
        """
        Obtains an OAuth2 access token using client credentials flow.
        """
        if self.access_token and time.time() < self.token_expires_at:
            logger.debug("Using existing valid access token.")
            return

        logger.info("Requesting new OAuth2 access token...")
        try:
            response = requests.post(
                self.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                timeout=10,
            )
            response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
            token_data = response.json()
            self.access_token = token_data["access_token"]
            expires_in = token_data.get("expires_in", 3600)  # Default to 1 hour if not provided
            self.token_expires_at = (
                time.time() + expires_in - 60
            )  # Refresh 60 seconds before expiry
            logger.info("Successfully obtained new access token.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error obtaining OAuth2 token: {e}")
            raise

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=(
            retry_if_exception_type(requests.exceptions.RequestException)
            | retry_if_exception_type(requests.exceptions.HTTPError)
        ),
        reraise=True,
    )
    def _make_request(self, method: str, endpoint: str, data: dict = None, params: dict = None):
        """
        Helper method to make authenticated API requests.
        Automatically refreshes token if needed.
        """
        self._get_access_token()
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url}{endpoint}"

        try:
            response = requests.request(
                method, url, headers=headers, json=data, params=params, timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(
                f"HTTP error for {method} {endpoint}: {e.response.status_code} - {e.response.text}"
            )
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error for {method} {endpoint}: {e}")
            raise

    def submit_narrative_detection(self, narrative_data: dict) -> dict:
        """
        Submits data for narrative detection.
        Endpoint: POST /api/v2/narratives/detect
        Validates payload against NARRATIVE_DETECT_REQUEST_SCHEMA.
        """
        try:
            validate(instance=narrative_data, schema=NARRATIVE_DETECT_REQUEST_SCHEMA)
            logger.debug("Narrative detection payload validated successfully.")
        except ValidationError as e:
            logger.error(f"Narrative detection payload validation failed: {e.message}")
            raise ValueError(f"Invalid narrative detection payload: {e.message}")

        logger.info(f"Submitting narrative detection: {narrative_data.get('text', '')[:50]}...")
        return self._make_request("POST", "/api/v2/narratives/detect", data=narrative_data)

    def create_entity_linkage(self, linkage_data: dict) -> dict:
        """
        Creates narrative-to-entity linkages.
        Endpoint: POST /api/v2/entities/link
        Validates payload against ENTITY_LINK_REQUEST_SCHEMA.
        """
        try:
            validate(instance=linkage_data, schema=ENTITY_LINK_REQUEST_SCHEMA)
            logger.debug("Entity linkage payload validated successfully.")
        except ValidationError as e:
            logger.error(f"Entity linkage payload validation failed: {e.message}")
            raise ValueError(f"Invalid entity linkage payload: {e.message}")

        logger.info(f"Creating entity linkage for narrative: {linkage_data.get('narrative_id')}")
        return self._make_request("POST", "/api/v2/entities/link", data=linkage_data)

    def publish_counter_message(self, counter_message_data: dict) -> dict:
        """
        Registers and publishes a counter-message.
        Endpoint: POST /api/v2/countermeasures/publish
        Validates payload against COUNTER_MESSAGE_PUBLISH_REQUEST_SCHEMA.
        """
        try:
            validate(instance=counter_message_data, schema=COUNTER_MESSAGE_PUBLISH_REQUEST_SCHEMA)
            logger.debug("Counter-message payload validated successfully.")
        except ValidationError as e:
            logger.error(f"Counter-message payload validation failed: {e.message}")
            raise ValueError(f"Invalid counter-message payload: {e.message}")

        logger.info(
            f"Publishing counter-message for narrative: {counter_message_data.get('narrative_id')}"
        )
        return self._make_request(
            "POST", "/api/v2/countermeasures/publish", data=counter_message_data
        )

    def search_narratives(self, tags: str = None, query_params: dict = None) -> dict:
        """
        Retrieves past narratives and metadata.
        Endpoint: GET /api/v2/narratives/search
        """
        params = query_params if query_params else {}
        if tags:
            params["tags"] = tags
        logger.info(f"Searching narratives with params: {params}")
        return self._make_request("GET", "/api/v2/narratives/search", params=params)


# Example Usage (for testing this module independently)
if __name__ == "__main__":
    # --- IMPORTANT: Replace these with your actual IntelGraph API and OAuth2 details ---
    API_CONFIG = {
        "intelgraph_api_base_url": "https://api.intelgraph.com",  # e.g., 'https://your-intelgraph-api.com'
        "oauth_token_url": "https://auth.intelgraph.com/oauth/token",  # e.g., 'https://your-auth-server.com/oauth/token'
        "oauth_client_id": "your_client_id",
        "oauth_client_secret": "your_client_secret",
    }

    client = None
    try:
        client = IntelGraphAPIClient(API_CONFIG)

        # Example: Submit a narrative detection
        narrative_payload = {
            "text": "The West is collapsing under its own weight.",
            "source": "twitter",
            "region": "Europe",
            "signal_score": 0.91,
            "tags": ["anti-western", "instability"],
        }
        logger.info("\n--- Testing submit_narrative_detection ---")
        detection_response = client.submit_narrative_detection(narrative_payload)
        print(json.dumps(detection_response, indent=2))

        # Example: Create entity linkage
        linkage_payload = {
            "narrative_id": detection_response.get("narrative_id", "mock_narr_id"),
            "entities": [
                {"name": "Western governments", "type": "geopolitical", "confidence": 0.88}
            ],
            "relationships": [
                {
                    "source": "Western governments",
                    "target": "economic collapse",
                    "relation": "blamed_for",
                }
            ],
        }
        logger.info("\n--- Testing create_entity_linkage ---")
        linkage_response = client.create_entity_linkage(linkage_payload)
        print(json.dumps(linkage_response, indent=2))

        # Example: Publish a counter-message
        counter_message_payload = {
            "narrative_id": detection_response.get("narrative_id", "mock_narr_id"),
            "message": "Despite internal challenges, Western democracies continue to adapt and innovate.",
            "channels": ["twitter", "facebook", "telegram"],
            "intent": "reframe",
            "language": "en",
        }
        logger.info("\n--- Testing publish_counter_message ---")
        publish_response = client.publish_counter_message(counter_message_payload)
        print(json.dumps(publish_response, indent=2))

        # Example: Search narratives
        logger.info("\n--- Testing search_narratives ---")
        search_response = client.search_narratives(tags="anti-western")
        print(json.dumps(search_response, indent=2))

    except requests.exceptions.RequestException as e:
        logger.error(f"API client test failed: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred during API client test: {e}")
