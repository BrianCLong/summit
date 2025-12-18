package streaming

import java.time.Duration
import java.util.Properties
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.producer.ProducerConfig
import org.apache.kafka.common.config.TopicConfig
import org.apache.kafka.common.serialization.Serdes
import org.apache.kafka.streams.KafkaStreams
import org.apache.kafka.streams.StreamsBuilder
import org.apache.kafka.streams.StreamsConfig

fun main() {
  val builder = StreamsBuilder()
  val topology = topology(builder)

  val props = Properties().apply {
    put(StreamsConfig.APPLICATION_ID_CONFIG, env("STREAMS_APP_ID", "stream-jobs"))
    put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, env("BOOTSTRAP_SERVERS", "localhost:9092"))
    put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2)
    put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, env("STREAM_THREADS", "1"))
    put(StreamsConfig.STATE_DIR_CONFIG, env("STATE_DIR", "/tmp/stream-jobs"))
    put(StreamsConfig.TOPOLOGY_OPTIMIZATION_CONFIG, StreamsConfig.OPTIMIZE)
    put(StreamsConfig.REPLICATION_FACTOR_CONFIG, env("STREAM_REPLICATION", "3"))
    put(StreamsConfig.producerPrefix(ProducerConfig.ACKS_CONFIG), "all")
    put(StreamsConfig.producerPrefix(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG), "true")
    put(StreamsConfig.producerPrefix(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION), "1")
    put(StreamsConfig.consumerPrefix(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG), "earliest")
    put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, Duration.ofSeconds(10).toMillis())
    put(StreamsConfig.BUFFERED_RECORDS_PER_PARTITION_CONFIG, 1000)
    put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String()::class.java)
    put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String()::class.java)
    put(StreamsConfig.topicPrefix(TopicConfig.CLEANUP_POLICY_CONFIG), TopicConfig.CLEANUP_POLICY_COMPACT)
  }

  val streams = KafkaStreams(topology, props)
  streams.setUncaughtExceptionHandler { _, exception ->
    System.err.println("Streams error: ${exception.message}")
    KafkaStreams.UncaughtExceptionHandler.StreamThreadExceptionResponse.SHUTDOWN_APPLICATION
  }

  Runtime.getRuntime().addShutdownHook(Thread(streams::close))

  streams.start()
}

private fun env(key: String, default: String): String = System.getenv(key) ?: default
