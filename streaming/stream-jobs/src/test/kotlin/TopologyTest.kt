package streaming

import java.time.Instant
import java.util.Properties
import org.apache.kafka.common.serialization.Serdes
import org.apache.kafka.streams.StreamsBuilder
import org.apache.kafka.streams.StreamsConfig
import org.apache.kafka.streams.TestInputTopic
import org.apache.kafka.streams.TestOutputTopic
import org.apache.kafka.streams.TopologyTestDriver
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class TopologyTest {
  private lateinit var driver: TopologyTestDriver
  private lateinit var rawInput: TestInputTopic<String, Event>
  private lateinit var featureInput: TestInputTopic<String, Feature>
  private lateinit var signalsOutput: TestOutputTopic<String, Score>
  private lateinit var alertsOutput: TestOutputTopic<String, String>
  private lateinit var analyticsOutput: TestOutputTopic<String, AlertMetric>

  @BeforeEach
  fun setup() {
    val props = Properties().apply {
      put(StreamsConfig.APPLICATION_ID_CONFIG, "test-stream-jobs")
      put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "dummy:9092")
      put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2)
      put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().javaClass)
      put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().javaClass)
    }

    val builder = StreamsBuilder()
    val topology = topology(builder)
    driver = TopologyTestDriver(topology, props)

    rawInput = driver.createInputTopic("ingest.raw.v1", Serdes.String().serializer(), eventSerde().serializer())
    featureInput = driver.createInputTopic("features.entity.v1", Serdes.String().serializer(), featureSerde().serializer())
    signalsOutput = driver.createOutputTopic("signals.scores.v1", Serdes.String().deserializer(), scoreSerde().deserializer())
    alertsOutput = driver.createOutputTopic("alerts.v1", Serdes.String().deserializer(), Serdes.String().deserializer())
    analyticsOutput = driver.createOutputTopic("alerts.analytics.v1", Serdes.String().deserializer(), alertMetricSerde().deserializer())
  }

  @AfterEach
  fun teardown() {
    driver.close()
  }

  @Test
  fun `produces enriched alerts and analytics`() {
    val timestamp = Instant.EPOCH

    featureInput.pipeInput("e-1", Feature("e-1", 0.5), timestamp)
    rawInput.pipeInput("ignored", Event("e-1", 1.0), timestamp)

    val score = signalsOutput.readValue()
    assertEquals(Score("e-1", 1.5, 0.5), score)

    val alert = alertsOutput.readValue()
    assertEquals("{\"entityId\":\"e-1\",\"score\":1.5}", alert)

    val metric = analyticsOutput.readValue()
    assertEquals(AlertMetric(0, 60_000, 1), metric)
  }
}
