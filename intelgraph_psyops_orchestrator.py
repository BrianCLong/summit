import logging
import json
from config_loader import ConfigLoader

# Import IntelGraph client modules
from python.counter_psyops_engine import PsyOpsCounterEngine
from intelgraph_kafka_consumer import IntelGraphKafkaConsumer
from intelgraph_api_client import IntelGraphAPIClient
from intelgraph_neo4j_client import IntelGraphNeo4jClient
from intelgraph_postgres_client import IntelGraphPostgresClient
from confluent_kafka import KafkaException

# Configure logging for the orchestrator
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    # Load configuration
    config_loader = ConfigLoader()
    CONFIG = config_loader.load_all_config()

    kafka_consumer = None
    api_client = None
    neo4j_client = None
    postgres_client = None
    psyops_engine = None

    try:
        logger.info("--- Initializing IntelGraph Clients ---")
        kafka_consumer = IntelGraphKafkaConsumer(
            config={
                'kafka_broker_url': CONFIG['KAFKA_BOOTSTRAP_SERVERS'],
                'schema_registry_url': CONFIG['SCHEMA_REGISTRY_URL'],
                'topic': CONFIG['KAFKA_TOPIC'],
                'group_id': CONFIG['KAFKA_GROUP_ID'],
                'sasl_username': CONFIG['KAFKA_SASL_USERNAME'],
                'sasl_password': CONFIG['KAFKA_SASL_PASSWORD'],
                'ssl_ca_location': CONFIG['KAFKA_SSL_CA_LOCATION']
            }
        )
        api_client = IntelGraphAPIClient(
            config={
                'intelgraph_api_base_url': CONFIG['INTELGRAPH_API_BASE_URL'],
                'oauth_token_url': CONFIG['OAUTH_TOKEN_URL'],
                'oauth_client_id': CONFIG['OAUTH_CLIENT_ID'],
                'oauth_client_secret': CONFIG['OAUTH_CLIENT_SECRET']
            }
        )
        neo4j_client = IntelGraphNeo4jClient(
            config={
                'neo4j_uri': CONFIG['NEO4J_URI'],
                'neo4j_username': CONFIG['NEO4J_USER'],
                'neo4j_password': CONFIG['NEO4J_PASSWORD']
            }
        )
        postgres_client = IntelGraphPostgresClient(
            config={
                'pg_host': CONFIG['PG_HOST'],
                'pg_port': CONFIG['PG_PORT'],
                'pg_dbname': CONFIG['PG_DBNAME'],
                'pg_user': CONFIG['PG_USER'],
                'pg_password': CONFIG['PG_PASSWORD']
            }
        )

        logger.info("--- Initializing PsyOps Counter Engine ---")
        psyops_engine = PsyOpsCounterEngine(api_client, neo4j_client, postgres_client)

        logger.info(f"--- Starting IntelGraph PsyOps Orchestrator ---")
        logger.info(f"Consuming messages from Kafka topic: {CONFIG['kafka_topic']}")
        logger.info("Press Ctrl+C to stop the orchestrator.")

        # Main consumption loop
        for message_data in kafka_consumer.consume_messages():
            if message_data:
                logger.info(f"Processing new message: {json.dumps(message_data, indent=2)}")
                postgres_client.log_processing_event(
                    event_type="MESSAGE_RECEIVED",
                    message="New Kafka message received for processing.",
                    metadata=message_data
                )

                try:
                    # Phase 1: Detection
                    narrative_analysis = psyops_engine.detection_phase(message_data)

                    # Phase 2: Analysis
                    analysis_result = psyops_engine.analysis_phase(narrative_analysis)

                    # Phase 3: Counter-Messaging Generation
                    counter_message = psyops_engine.counter_messaging_generation_phase(analysis_result)

                    # Phase 4: Obfuscation Layers
                    final_counter_message = psyops_engine.obfuscation_layers_phase(
                        counter_message,
                        narrative_id=narrative_analysis.get('intelgraph_narrative_id')
                    )

                    logger.info("\n--- Counter-Operation Complete ---")
                    logger.info(f"Final Counter-Message Ready for Deployment: '{final_counter_message}'")
                    postgres_client.log_processing_event(
                        event_type="COUNTER_OPERATION_COMPLETE",
                        narrative_id=narrative_analysis.get('intelgraph_narrative_id'),
                        message="Full counter-operation cycle completed.",
                        metadata={"final_message": final_counter_message}
                    )
                    logger.info("="*80) # Separator for clarity

                except Exception as e:
                    narrative_id = message_data.get('intelgraph_narrative_id', f"unknown_narr_{hash(json.dumps(message_data))}")
                    logger.error(f"An error occurred during processing for narrative {narrative_id}: {e}", exc_info=True)
                    postgres_client.log_processing_event(
                        event_type="PROCESSING_ERROR",
                        narrative_id=narrative_id,
                        message=f"Error during processing: {e}",
                        metadata={"error": str(e), "message_data": message_data}
                    )
            else:
                logger.info("No message received from Kafka within timeout. Polling again...")

    except KafkaException as e:
        logger.critical(f"Kafka specific error: {e}", exc_info=True)
    except Exception as e:
        logger.critical(f"An unexpected critical error occurred: {e}", exc_info=True)
    finally:
        logger.info("--- Shutting down IntelGraph Orchestrator ---")
        if kafka_consumer:
            kafka_consumer.close()
        if neo4j_client:
            neo4j_client.close()
        if postgres_client:
            postgres_client.close()
        logger.info("All clients closed.")

if __name__ == "__main__":
    main()