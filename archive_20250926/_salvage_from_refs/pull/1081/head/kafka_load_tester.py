import logging
import random
import time
from datetime import UTC, datetime

from confluent_kafka import KafkaException, Producer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import MessageField, SerializationContext, StringSerializer

from config_loader import ConfigLoader

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Avro Schema for the social ingest message
SOCIAL_INGEST_AVRO_SCHEMA = """
{
  "type": "record",
  "name": "SocialIngestMessage",
  "namespace": "intelgraph.raw",
  "fields": [
    {"name": "source", "type": "string"},
    {"name": "timestamp", "type": "string"},
    {"name": "author_id", "type": "string"},
    {"name": "content", "type": "string"},
    {"name": "language", "type": "string"},
    {"name": "region", "type": "string"},
    {"name": "tags", "type": {"type": "array", "items": "string"}},
    {"name": "signal_score", "type": "double"}
  ]
}
"""


class KafkaLoadTester:
    """
    A Kafka producer for simulating incoming messages to IntelGraph's real-time data ingestion stream.
    Handles SASL/SCRAM-SHA-512 authentication, TLS, and Avro serialization
    via Confluent Schema Registry.
    """

    def __init__(self, config: dict):
        self.config = config
        self.producer = None
        self.avro_serializer = None
        self.string_serializer = StringSerializer("utf_8")
        self._initialize_producer()

    def _initialize_producer(self):
        """
        Initializes the Kafka producer and Avro serializer.
        """
        logger.info("Initializing Kafka producer...")

        # Schema Registry client setup
        schema_registry_conf = {"url": self.config["SCHEMA_REGISTRY_URL"]}
        schema_registry_client = SchemaRegistryClient(schema_registry_conf)

        # Avro Serializer setup
        self.avro_serializer = AvroSerializer(
            schema_registry_client, SOCIAL_INGEST_AVRO_SCHEMA, conf={"auto.register.schemas": True}
        )

        # Kafka Producer configuration
        producer_conf = {
            "bootstrap.servers": self.config["KAFKA_BOOTSTRAP_SERVERS"],
            "sasl.mechanisms": "SCRAM-SHA-512",
            "security.protocol": "SASL_SSL",
            "sasl.username": self.config["KAFKA_SASL_USERNAME"],
            "sasl.password": self.config["KAFKA_SASL_PASSWORD"],
            "ssl.ca.location": self.config.get(
                "KAFKA_SSL_CA_LOCATION"
            ),  # Optional: Path to CA certificate file
            "acks": "all",  # Ensure all replicas acknowledge the write
        }

        try:
            self.producer = Producer(producer_conf)
            logger.info("Kafka producer initialized successfully.")
        except KafkaException as e:
            logger.error(f"Error initializing Kafka producer: {e}")
            raise

    def _delivery_report(self, err, msg):
        """
        Callback function for delivery reports.
        """
        if err is not None:
            logger.error(f"Message delivery failed: {err}")
        else:
            logger.info(
                f"Message delivered to {msg.topic()} [{msg.partition()}] @ offset {msg.offset()}"
            )

    def generate_message_payload(self) -> dict:
        """
        Generates a realistic message payload based on the Avro schema.
        """
        sample_contents = [
            "The West is on the brink of collapse.",
            "Our leaders are failing us, trust no one.",
            "Economic crisis is inevitable, prepare for the worst.",
            "The truth about the pandemic is being hidden from you.",
            "Globalists are controlling the narrative, wake up!",
        ]
        sample_sources = ["telegram", "twitter", "facebook", "4chan", "reddit"]
        sample_languages = ["en", "es", "fr", "de"]
        sample_regions = ["Europe", "North America", "Asia", "Middle East"]
        sample_tags = [
            ["disinformation", "anti-western"],
            ["conspiracy", "anti-government"],
            ["economic_fear", "instability"],
            ["medical_misinfo", "control"],
            ["globalist_agenda", "propaganda"],
        ]

        return {
            "source": random.choice(sample_sources),
            "timestamp": datetime.now(UTC).isoformat(timespec="seconds") + "Z",
            "author_id": f"user_{random.randint(100000, 999999)}",
            "content": random.choice(sample_contents),
            "language": random.choice(sample_languages),
            "region": random.choice(sample_regions),
            "tags": random.choice(sample_tags),
            "signal_score": round(random.uniform(0.5, 0.99), 2),
        }

    def produce_messages(self, num_messages: int, interval_sec: float = 0.1):
        """
        Produces a specified number of messages to the Kafka topic.
        """
        logger.info(
            f"Starting to produce {num_messages} messages to topic {self.config['KAFKA_TOPIC']}..."
        )
        for i in range(num_messages):
            try:
                message_payload = self.generate_message_payload()
                # Key can be None or a string. Using author_id as key for partitioning.
                key = self.string_serializer(message_payload["author_id"])

                self.producer.produce(
                    topic=self.config["KAFKA_TOPIC"],
                    key=key,
                    value=self.avro_serializer(
                        message_payload,
                        SerializationContext(self.config["KAFKA_TOPIC"], MessageField.VALUE),
                    ),
                    on_delivery=self._delivery_report,
                )
                self.producer.poll(0)  # Poll for callbacks
                logger.debug(f"Produced message {i+1}/{num_messages}")
                time.sleep(interval_sec)
            except BufferError:
                logger.warning(
                    "Local producer queue is full, waiting for messages to be delivered..."
                )
                self.producer.poll(1)  # Wait for 1 second for messages to be delivered
            except KafkaException as e:
                logger.error(f"Kafka error during production: {e}")
                break
            except Exception as e:
                logger.error(
                    f"An unexpected error occurred during message generation/production: {e}",
                    exc_info=True,
                )
                break

        logger.info("Flushing producer to ensure all messages are sent...")
        self.producer.flush(timeout=10)  # Flush any remaining messages with a timeout
        logger.info("Message production complete.")

    def close(self):
        """
        Closes the Kafka producer.
        """
        if self.producer:
            self.producer.flush()
            logger.info("Kafka producer flushed and closed.")


# Example Usage (for testing this module independently)
if __name__ == "__main__":
    # Load configuration using ConfigLoader
    config_loader = ConfigLoader()
    CONFIG = config_loader.load_all_config()

    # Ensure required Kafka config for producer is present
    required_keys = [
        "KAFKA_BOOTSTRAP_SERVERS",
        "KAFKA_TOPIC",
        "KAFKA_SASL_USERNAME",
        "KAFKA_SASL_PASSWORD",
        "SCHEMA_REGISTRY_URL",
    ]
    for key in required_keys:
        if key not in CONFIG or CONFIG[key] is None:
            logger.error(f"Missing required configuration for Kafka producer: {key}")
            exit(1)

    tester = None
    try:
        tester = KafkaLoadTester(CONFIG)
        # Produce 10 messages with 0.5 second interval
        tester.produce_messages(num_messages=10, interval_sec=0.5)

    except Exception as e:
        logger.critical(f"Load tester failed: {e}", exc_info=True)
    finally:
        if tester:
            tester.close()
