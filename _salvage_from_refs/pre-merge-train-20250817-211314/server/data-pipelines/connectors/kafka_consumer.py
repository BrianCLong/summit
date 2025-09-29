"""
Kafka Connector for IntelGraph
Handles streaming data ingestion from Kafka topics
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, AsyncIterator
from datetime import datetime
import logging

try:
    from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
    from aiokafka.errors import KafkaError
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

from .base import BaseConnector

class KafkaConnector(BaseConnector):
    """
    Connector for Kafka streaming data sources
    Supports consuming from multiple topics with various message formats
    """
    
    def __init__(self, name: str, config: Dict[str, Any]):
        if not KAFKA_AVAILABLE:
            raise ImportError("aiokafka is required for Kafka connector. Install with: pip install aiokafka")
            
        super().__init__(name, config)
        
        # Kafka configuration
        self.bootstrap_servers = config.get("bootstrap_servers", ["localhost:9092"])
        self.topic = config.get("topic")
        self.topics = config.get("topics", [])
        
        # Consumer configuration
        self.group_id = config.get("group_id", f"intelgraph-{name}")
        self.auto_offset_reset = config.get("auto_offset_reset", "latest")
        self.enable_auto_commit = config.get("enable_auto_commit", True)
        self.max_poll_records = config.get("max_poll_records", 500)
        
        # Message format configuration
        self.message_format = config.get("message_format", "json")  # json, avro, string
        self.key_deserializer = config.get("key_deserializer", "string")
        self.value_deserializer = config.get("value_deserializer", "json")
        
        # Processing configuration
        self.batch_timeout_ms = config.get("batch_timeout_ms", 1000)
        self.max_processing_time_ms = config.get("max_processing_time_ms", 30000)
        
        # Security configuration
        self.security_protocol = config.get("security_protocol", "PLAINTEXT")
        self.sasl_mechanism = config.get("sasl_mechanism")
        self.sasl_username = config.get("sasl_username")
        self.sasl_password = config.get("sasl_password")
        
        # State
        self._consumer: Optional[AIOKafkaConsumer] = None
        self._consuming = False
        
    async def connect(self) -> bool:
        """
        Establish connection to Kafka
        """
        try:
            # Determine topics to consume from
            topics_to_consume = []
            if self.topic:
                topics_to_consume.append(self.topic)
            if self.topics:
                topics_to_consume.extend(self.topics)
            
            if not topics_to_consume:
                raise ValueError("No topics specified for consumption")
            
            # Create consumer configuration
            consumer_config = {
                "bootstrap_servers": self.bootstrap_servers,
                "group_id": self.group_id,
                "auto_offset_reset": self.auto_offset_reset,
                "enable_auto_commit": self.enable_auto_commit,
                "max_poll_records": self.max_poll_records,
                "security_protocol": self.security_protocol
            }
            
            # Add SASL authentication if configured
            if self.sasl_mechanism:
                consumer_config.update({
                    "sasl_mechanism": self.sasl_mechanism,
                    "sasl_plain_username": self.sasl_username,
                    "sasl_plain_password": self.sasl_password
                })
            
            # Create consumer
            self._consumer = AIOKafkaConsumer(
                *topics_to_consume,
                **consumer_config
            )
            
            # Start consumer
            await self._consumer.start()
            
            self.logger.info(f"Connected to Kafka topics: {topics_to_consume}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to connect to Kafka: {e}")
            return False
    
    async def disconnect(self) -> None:
        """
        Close Kafka connection
        """
        self._consuming = False
        
        if self._consumer:
            try:
                await self._consumer.stop()
            except Exception as e:
                self.logger.warning(f"Error stopping Kafka consumer: {e}")
            finally:
                self._consumer = None
    
    async def test_connection(self) -> bool:
        """
        Test Kafka connection by fetching topic metadata
        """
        try:
            if not self._consumer:
                return False
                
            # Get topic metadata to verify connection
            metadata = await self._consumer.client.fetch_metadata()
            
            # Check if our topics exist
            available_topics = set(metadata.topics.keys())
            required_topics = set()
            
            if self.topic:
                required_topics.add(self.topic)
            if self.topics:
                required_topics.update(self.topics)
            
            missing_topics = required_topics - available_topics
            if missing_topics:
                self.logger.warning(f"Topics not found: {missing_topics}")
                return False
                
            return True
            
        except Exception as e:
            self.logger.error(f"Kafka connection test failed: {e}")
            return False
    
    async def extract_data(self, 
                          max_messages: Optional[int] = None,
                          timeout_seconds: Optional[int] = None,
                          **kwargs) -> AsyncIterator[Dict[str, Any]]:
        """
        Extract data from Kafka topics
        Yields individual messages as dictionaries
        """
        if not self._consumer:
            raise Exception("Consumer not connected")
        
        try:
            self._consuming = True
            message_count = 0
            start_time = datetime.now()
            
            # Set up timeout if specified
            timeout_task = None
            if timeout_seconds:
                async def timeout_handler():
                    await asyncio.sleep(timeout_seconds)
                    self._consuming = False
                
                timeout_task = asyncio.create_task(timeout_handler())
            
            try:
                while self._consuming:
                    # Check message limit
                    if max_messages and message_count >= max_messages:
                        self.logger.info(f"Reached maximum messages limit: {max_messages}")
                        break
                    
                    # Poll for messages
                    message_batch = await self._consumer.getmany(
                        timeout_ms=self.batch_timeout_ms
                    )
                    
                    if not message_batch:
                        # No messages received in timeout period
                        continue
                    
                    # Process messages from all partitions
                    for topic_partition, messages in message_batch.items():
                        for message in messages:
                            try:
                                record = await self._process_message(message)
                                if record:
                                    yield record
                                    message_count += 1
                                    
                            except Exception as e:
                                self.logger.error(f"Failed to process message: {e}")
                                continue
                    
                    # Yield control to other coroutines
                    await asyncio.sleep(0)
                    
            finally:
                if timeout_task:
                    timeout_task.cancel()
                    
        except Exception as e:
            self.logger.error(f"Kafka data extraction failed: {e}")
            raise
        finally:
            self._consuming = False
    
    async def _process_message(self, message) -> Optional[Dict[str, Any]]:
        """
        Process a single Kafka message and convert to record
        """
        try:
            # Extract message metadata
            record = {
                "_kafka_metadata": {
                    "topic": message.topic,
                    "partition": message.partition,
                    "offset": message.offset,
                    "timestamp": message.timestamp,
                    "timestamp_type": message.timestamp_type,
                    "key": self._deserialize_key(message.key),
                    "headers": dict(message.headers) if message.headers else {}
                }
            }
            
            # Deserialize message value
            value = self._deserialize_value(message.value)
            
            if isinstance(value, dict):
                # Merge message value with metadata
                record.update(value)
            else:
                # Store non-dict values in 'value' field
                record["value"] = value
            
            return record
            
        except Exception as e:
            self.logger.error(f"Failed to process message: {e}")
            return None
    
    def _deserialize_key(self, key_bytes: Optional[bytes]) -> Any:
        """
        Deserialize message key based on configuration
        """
        if not key_bytes:
            return None
            
        try:
            if self.key_deserializer == "json":
                return json.loads(key_bytes.decode('utf-8'))
            elif self.key_deserializer == "string":
                return key_bytes.decode('utf-8')
            else:
                return key_bytes
                
        except Exception as e:
            self.logger.warning(f"Failed to deserialize key: {e}")
            return key_bytes.decode('utf-8', errors='ignore')
    
    def _deserialize_value(self, value_bytes: Optional[bytes]) -> Any:
        """
        Deserialize message value based on configuration
        """
        if not value_bytes:
            return None
            
        try:
            if self.value_deserializer == "json":
                return json.loads(value_bytes.decode('utf-8'))
            elif self.value_deserializer == "string":
                return value_bytes.decode('utf-8')
            elif self.value_deserializer == "avro":
                # TODO: Implement Avro deserialization
                self.logger.warning("Avro deserialization not implemented yet")
                return value_bytes.decode('utf-8', errors='ignore')
            else:
                return value_bytes
                
        except Exception as e:
            self.logger.warning(f"Failed to deserialize value: {e}")
            return value_bytes.decode('utf-8', errors='ignore')
    
    async def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about Kafka topics and consumer
        """
        metadata = {
            "connector_type": "kafka",
            "bootstrap_servers": self.bootstrap_servers,
            "topics": [self.topic] if self.topic else [] + (self.topics or []),
            "group_id": self.group_id,
            "auto_offset_reset": self.auto_offset_reset,
            "message_format": self.message_format,
            "security_protocol": self.security_protocol
        }
        
        try:
            if self._consumer:
                # Get topic metadata
                cluster_metadata = await self._consumer.client.fetch_metadata()
                
                topic_info = {}
                for topic_name in (self.topics or []) + ([self.topic] if self.topic else []):
                    if topic_name in cluster_metadata.topics:
                        topic_metadata = cluster_metadata.topics[topic_name]
                        topic_info[topic_name] = {
                            "partitions": len(topic_metadata.partitions),
                            "partition_info": {
                                pid: {
                                    "leader": partition.leader,
                                    "replicas": partition.replicas,
                                    "isr": partition.isr
                                }
                                for pid, partition in topic_metadata.partitions.items()
                            }
                        }
                
                metadata["topic_info"] = topic_info
                
                # Get consumer group information
                try:
                    # Get current position for each assigned partition
                    assignment = self._consumer.assignment()
                    if assignment:
                        partition_info = {}
                        for tp in assignment:
                            position = await self._consumer.position(tp)
                            partition_info[f"{tp.topic}-{tp.partition}"] = {
                                "current_offset": position
                            }
                        metadata["partition_assignment"] = partition_info
                        
                except Exception as e:
                    self.logger.warning(f"Could not get consumer position info: {e}")
                    
        except Exception as e:
            self.logger.warning(f"Could not get complete Kafka metadata: {e}")
            
        return metadata
    
    async def seek_to_beginning(self) -> None:
        """
        Seek all assigned partitions to the beginning
        """
        if self._consumer:
            assignment = self._consumer.assignment()
            for tp in assignment:
                await self._consumer.seek_to_beginning(tp)
            self.logger.info("Seeked all partitions to beginning")
    
    async def seek_to_end(self) -> None:
        """
        Seek all assigned partitions to the end
        """
        if self._consumer:
            assignment = self._consumer.assignment()
            for tp in assignment:
                await self._consumer.seek_to_end(tp)
            self.logger.info("Seeked all partitions to end")
    
    async def commit_offsets(self) -> None:
        """
        Manually commit current offsets
        """
        if self._consumer and not self.enable_auto_commit:
            await self._consumer.commit()
            self.logger.info("Committed current offsets")