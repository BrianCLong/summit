import logging
import os

from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class ConfigLoader:
    """
    Loads configuration from environment variables, falling back to .env file.
    """

    def __init__(self, env_path=".env"):
        load_dotenv(dotenv_path=env_path)
        logger.info(f"Configuration loaded from .env file (if present) at {env_path}")

    def get(self, key: str, default=None, required: bool = False):
        """
        Retrieves a configuration value.
        :param key: The environment variable key.
        :param default: Default value if the key is not found.
        :param required: If True, raises an error if key is not found and no default is provided.
        :return: The configuration value.
        """
        value = os.getenv(key, default)
        if required and value is None:
            raise ValueError(
                f"Required configuration key '{key}' not found in environment variables or .env file."
            )
        return value

    def get_int(self, key: str, default=None, required: bool = False):
        value = self.get(key, default, required)
        return int(value) if value is not None else None

    def get_bool(self, key: str, default=None, required: bool = False):
        value = self.get(key, default, required)
        if isinstance(value, str):
            return value.lower() in ("true", "1", "t", "y", "yes")
        return bool(value) if value is not None else None

    def get_list(self, key: str, default=None, required: bool = False, separator=","):
        value = self.get(key, default, required)
        if isinstance(value, str):
            return [item.strip() for item in value.split(separator) if item.strip()]
        return value if value is not None else []

    def load_all_config(self) -> dict:
        """
        Loads all expected configuration keys into a dictionary.
        """
        config = {
            "KAFKA_BOOTSTRAP_SERVERS": self.get("KAFKA_BOOTSTRAP_SERVERS", required=True),
            "KAFKA_TOPIC": self.get("KAFKA_TOPIC", required=True),
            "KAFKA_GROUP_ID": self.get("KAFKA_GROUP_ID", required=True),
            "KAFKA_SASL_USERNAME": self.get("KAFKA_SASL_USERNAME", required=True),
            "KAFKA_SASL_PASSWORD": self.get("KAFKA_SASL_PASSWORD", required=True),
            "INTELGRAPH_API_BASE_URL": self.get("INTELGRAPH_API_BASE_URL", required=True),
            "OAUTH_CLIENT_ID": self.get("OAUTH_CLIENT_ID", required=True),
            "OAUTH_CLIENT_SECRET": self.get("OAUTH_CLIENT_SECRET", required=True),
            "NEO4J_URI": self.get("NEO4J_URI", required=True),
            "NEO4J_USER": self.get("NEO4J_USER", required=True),
            "NEO4J_PASSWORD": self.get("NEO4J_PASSWORD", required=True),
            "POSTGRES_URI": self.get("POSTGRES_URI", required=True),
            "SPACY_MODEL": self.get("SPACY_MODEL", default="en_core_web_sm"),
            # Optional: Kafka SSL CA location
            "KAFKA_SSL_CA_LOCATION": self.get("KAFKA_SSL_CA_LOCATION"),
            # Optional: OAuth Token URL (if different from default derivation)
            "OAUTH_TOKEN_URL": self.get("OAUTH_TOKEN_URL"),
            # Optional: PostgreSQL details if not parsed from URI
            "PG_HOST": self.get("PG_HOST"),
            "PG_PORT": self.get_int("PG_PORT"),
            "PG_DBNAME": self.get("PG_DBNAME"),
            "PG_USER": self.get("PG_USER"),
            "PG_PASSWORD": self.get("PG_PASSWORD"),
        }
        # Derive OAUTH_TOKEN_URL if not explicitly provided
        if not config["OAUTH_TOKEN_URL"] and config["INTELGRAPH_API_BASE_URL"]:
            config["OAUTH_TOKEN_URL"] = f"{config["INTELGRAPH_API_BASE_URL"]}/oauth/token"
            logger.info(f"Derived OAUTH_TOKEN_URL: {config["OAUTH_TOKEN_URL"]}")

        # Parse PostgreSQL URI if individual PG_HOST, etc. are not provided
        if config["POSTGRES_URI"] and not config["PG_HOST"]:
            try:
                from urllib.parse import urlparse

                parsed_uri = urlparse(config["POSTGRES_URI"])
                config["PG_HOST"] = parsed_uri.hostname
                config["PG_PORT"] = parsed_uri.port if parsed_uri.port else 5432
                config["PG_DBNAME"] = parsed_uri.path.strip("/")
                config["PG_USER"] = parsed_uri.username
                config["PG_PASSWORD"] = parsed_uri.password
                logger.info("Parsed PostgreSQL details from URI.")
            except Exception as e:
                logger.warning(
                    f"Could not parse PostgreSQL URI: {e}. Ensure individual PG_HOST, etc. are set if URI parsing fails."
                )

        return config


# Example Usage (for testing this module independently)
if __name__ == "__main__":
    # Create a dummy .env file for testing
    with open(".env.test", "w") as f:
        f.write("KAFKA_BOOTSTRAP_SERVERS=localhost:9092\n")
        f.write("KAFKA_TOPIC=test.topic\n")
        f.write("KAFKA_GROUP_ID=test_group\n")
        f.write("KAFKA_SASL_USERNAME=test_user\n")
        f.write("KAFKA_SASL_PASSWORD=test_password\n")
        f.write("INTELGRAPH_API_BASE_URL=http://localhost:8000\n")
        f.write("OAUTH_CLIENT_ID=test_client_id\n")
        f.write("OAUTH_CLIENT_SECRET=test_client_secret\n")
        f.write("NEO4J_URI=bolt://localhost:7687\n")
        f.write("NEO4J_USER=neo4j\n")
        f.write("NEO4J_PASSWORD=neo4j_pass\n")
        f.write("POSTGRES_URI=postgresql://pguser:pgpass@localhost:5432/pgdb\n")
        f.write("SPACY_MODEL=en_core_web_sm\n")

    loader = ConfigLoader(env_path=".env.test")
    loaded_config = loader.load_all_config()
    print("\n--- Loaded Configuration ---")
    for key, value in loaded_config.items():
        print(f"{key}: {value}")

    # Clean up dummy .env file
    os.remove(".env.test")
