#!/bin/bash

# Kafka topic initialization script

set -e

KAFKA_BROKER="kafka-1:9092"
PARTITIONS=12
REPLICATION_FACTOR=3

echo "Waiting for Kafka to be ready..."
sleep 30

echo "Creating topics..."

# Events topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.events \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# Entities topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.entities \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# Relationships topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.relationships \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# Alerts topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.alerts \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# Metrics topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.metrics \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=259200000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# Analytics topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.analytics \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# ML Features topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.ml.features \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# ML Predictions topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.ml.predictions \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# Audit topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.audit \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

# Dead letter queue topic
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic intelgraph.dlq \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --config compression.type=snappy \
  --config min.insync.replicas=2

echo "Topics created successfully!"

# List all topics
kafka-topics --list --bootstrap-server $KAFKA_BROKER
