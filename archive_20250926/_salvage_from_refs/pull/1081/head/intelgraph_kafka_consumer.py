import json
import logging

import requests
from confluent_kafka import Consumer, KafkaException
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import MessageField
from jsonschema import ValidationError, validate

from intelgraph.deception_detector import DeceptionDetector

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# JSON Schema for the social ingest message (derived from Avro schema)
SOCIAL_INGEST_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "source": {"type": "string"},
        "timestamp": {"type": "string"},
        "author_id": {"type": "string"},
        "content": {"type": "string"},
        "language": {"type": "string"},
        "region": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "signal_score": {"type": "number"},
    },
    "required": [
        "source",
        "timestamp",
        "author_id",
        "content",
        "language",
        "region",
        "tags",
        "signal_score",
    ],
}


class IntelGraphKafkaConsumer:
    """
    A Kafka consumer for IntelGraph's real-time data ingestion stream.
    Handles SASL/SCRAM-SHA-512 authentication, TLS, and Avro deserialization
    via Confluent Schema Registry.
    """

    def __init__(self, config: dict):
        self.config = config
        self.consumer = None
        self.avro_deserializer = None
        self.detector = DeceptionDetector()
        self._initialize_consumer()

    def _initialize_consumer(self):
        """
        Initializes the Kafka consumer and Avro deserializer.
        """
        logger.info("Initializing Kafka consumer...")

        # Schema Registry client setup
        schema_registry_conf = {"url": self.config["schema_registry_url"]}
        schema_registry_client = SchemaRegistryClient(schema_registry_conf)

        # Avro Deserializer setup
        # We assume the value is Avro, and the key might be None or a simple string
        self.avro_deserializer = AvroDeserializer(
            schema_registry_client, from_dict=self._json_deserializer
        )

        # Kafka Consumer configuration
        consumer_conf = {
            "bootstrap.servers": self.config["kafka_broker_url"],
            "group.id": self.config["group_id"],
            "auto.offset.reset": "earliest",  # Start consuming from the beginning if no offset is stored
            "enable.auto.commit": True,
            "sasl.mechanisms": "SCRAM-SHA-512",
            "security.protocol": "SASL_SSL",
            "sasl.username": self.config["sasl_username"],
            "sasl.password": self.config["sasl_password"],
            "ssl.ca.location": self.config.get(
                "ssl_ca_location"
            ),  # Optional: Path to CA certificate file
            "ssl.endpoint.identification.algorithm": "https",  # Recommended for TLS
        }

        try:
            self.consumer = Consumer(consumer_conf)
            self.consumer.subscribe([self.config["topic"]])
            logger.info(f"Kafka consumer subscribed to topic: {self.config['topic']}")
        except KafkaException as e:
            logger.error(f"Error initializing Kafka consumer: {e}")
            raise

    def _forward_to_ml_service(self, payload: dict) -> None:
        """Send a deserialized message to the ML service for inference."""
        ml_url = self.config.get("ml_service_url")
        if not ml_url:
            logger.debug("ML service URL not provided; skipping forward.")
            return
        try:
            resp = requests.post(f"{ml_url}/stream/anomaly", json=payload, timeout=5)
            resp.raise_for_status()
            logger.debug("Message forwarded to ML service successfully.")
        except Exception as e:
            logger.error(f"Failed to forward message to ML service: {e}")

    def _json_deserializer(self, obj, ctx):
        """
        Helper function for AvroDeserializer to convert Avro record to Python dict.
        """
        if obj is None:
            return None
        # AvroDeserializer already handles the Avro to dict conversion, this is just a pass-through
        # if the data is already in a dict format after Avro deserialization.
        return obj

    def consume_messages(self, timeout_ms: int = 1000):
        """
        Continuously consumes messages from the Kafka topic.
        Yields deserialized Avro messages and forwards them to the ML service
        for real-time anomaly detection.
        """
        logger.info(f"Starting message consumption from topic {self.config['topic']}...")
        while True:
            try:
                msg = self.consumer.poll(timeout_ms / 1000.0)

                if msg is None:
                    continue
                if msg.error():
                    if msg.error().is_fatal():
                        logger.error(f"Fatal consumer error: {msg.error()}")
                        raise KafkaException(msg.error())
                    else:
                        logger.warning(f"Consumer error: {msg.error()}")
                        continue

                deserialized_value = self.avro_deserializer(msg.value(), MessageField.VALUE)

                if deserialized_value is not None:
                    logger.info(
                        f"Received message: offset={msg.offset()}, partition={msg.partition()}"
                    )
                    try:
                        validate(instance=deserialized_value, schema=SOCIAL_INGEST_JSON_SCHEMA)
                        logger.debug("Message validated successfully against JSON schema.")
                        score = self.detector.score(deserialized_value.get("content", ""))
                        deserialized_value["deception_score"] = score
                        if score > 0.5:
                            deserialized_value["deception_flag"] = True
                        self._forward_to_ml_service(deserialized_value)
                        yield deserialized_value
                    except ValidationError as e:
                        logger.error(
                            f"JSON Schema validation failed for message at offset {msg.offset()}: {e.message}"
                        )
                        logger.debug(f"Invalid message content: {deserialized_value}")
                else:
                    logger.warning(f"Could not deserialize message value at offset {msg.offset()}")

            except KeyboardInterrupt:
                logger.info("Consumption interrupted by user.")
                break
            except Exception as e:
                logger.error(f"An unexpected error occurred during consumption: {e}", exc_info=True)

    def close(self):
        """
        Closes the Kafka consumer.
        """
        if self.consumer:
            self.consumer.close()
            logger.info("Kafka consumer closed.")


# Example Usage (for testing this module independently)
if __name__ == "__main__":
    # --- IMPORTANT: Replace these with your actual Kafka and Schema Registry details ---
    KAFKA_CONFIG = {
        "kafka_broker_url": "localhost:9092",  # e.g., 'your-kafka-broker-1:9092,your-kafka-broker-2:9092'
        "schema_registry_url": "http://localhost:8081",  # e.g., 'http://your-schema-registry:8081'
        "topic": "intelgraph.raw.social_ingest",
        "group_id": "psyops_counter_engine",
        "sasl_username": "your_sasl_username",
        "sasl_password": "your_sasl_password",
        "ssl_ca_location": None,  # Optional: '/path/to/your/ca.pem' if using custom CA
        "ml_service_url": "http://localhost:8000",
    }

    consumer = None
    try:
        consumer = IntelGraphKafkaConsumer(KAFKA_CONFIG)
        for message_data in consumer.consume_messages():
            print("\n--- Deserialized Message ---")
            print(json.dumps(message_data, indent=2))
            # In a real scenario, you would pass this message_data to the PsyOpsCounterEngine

    except KafkaException as e:
        logger.error(f"Kafka specific error in main: {e}")
    except Exception as e:
        logger.error(f"General error in main: {e}")
    finally:
        if consumer:
            consumer.close()
