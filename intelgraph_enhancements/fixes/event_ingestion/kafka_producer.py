
# kafka_ingestion.py

from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

event = {"type": "NEW_NODE", "id": "xyz", "timestamp": "2025-08-13T00:00Z"}
producer.send('intelgraph-events', event)
