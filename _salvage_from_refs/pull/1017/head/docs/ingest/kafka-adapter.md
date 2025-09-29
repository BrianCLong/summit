# Kafka Adapter

An optional Kafka adapter ingests high-volume events.
Each tenant receives a topic prefix and quota; backpressure is
propagated to upstream connectors. Enable with `ENABLE_KAFKA=true`.
