package streaming

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.KotlinModule
import org.apache.kafka.common.serialization.Deserializer
import org.apache.kafka.common.serialization.Serde
import org.apache.kafka.common.serialization.Serdes
import org.apache.kafka.common.serialization.Serializer

private val mapper: ObjectMapper = ObjectMapper()
  .registerModule(KotlinModule.Builder().build())

fun <T> jsonSerde(clazz: Class<T>): Serde<T> {
  val serializer = Serializer<T> { _, data -> mapper.writeValueAsBytes(data) }
  val deserializer = Deserializer<T> { _, bytes ->
    if (bytes == null) return@Deserializer null
    mapper.readValue(bytes, clazz)
  }
  return Serdes.serdeFrom(serializer, deserializer)
}

fun eventSerde(): Serde<Event> = jsonSerde(Event::class.java)
fun featureSerde(): Serde<Feature> = jsonSerde(Feature::class.java)
fun scoreSerde(): Serde<Score> = jsonSerde(Score::class.java)
fun alertMetricSerde(): Serde<AlertMetric> = jsonSerde(AlertMetric::class.java)
