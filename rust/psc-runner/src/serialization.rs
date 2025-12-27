use serde::{Deserialize, Serialize};
use validator::Validate;
use std::time::Duration;

#[derive(Serialize, Deserialize, Validate, Clone, Debug)]
pub struct SerializationConfig {
    pub format: String, // "json", "proto", etc.
}

#[derive(Debug, Clone, PartialEq)]
pub enum SerializationFormat {
    Json,
    Protobuf,
    Avro,
}

#[derive(Debug, Clone)]
pub struct SerializationBenchmark {
    pub format: SerializationFormat,
    pub payload_size: usize,
    pub serialize_time: Duration,
    pub deserialize_time: Duration,
    pub compressed_size: usize,
}
