package streaming

import java.time.Duration
import org.apache.kafka.common.serialization.Serdes
import org.apache.kafka.streams.StreamsBuilder
import org.apache.kafka.streams.Topology
import org.apache.kafka.streams.kstream.Consumed
import org.apache.kafka.streams.kstream.Grouped
import org.apache.kafka.streams.kstream.Joined
import org.apache.kafka.streams.kstream.KeyValue
import org.apache.kafka.streams.kstream.KStream
import org.apache.kafka.streams.kstream.KTable
import org.apache.kafka.streams.kstream.Produced
import org.apache.kafka.streams.kstream.StreamPartitioner
import org.apache.kafka.streams.kstream.TimeWindows

data class Event(val entityId: String, val value: Double)
data class Feature(val entityId: String, val deg: Double)
data class Enriched(val entityId: String, val value: Double, val deg: Double)
data class Score(val entityId: String, val score: Double, val threshold: Double = 0.5)
data class AlertMetric(val windowStartMs: Long, val windowEndMs: Long, val count: Long)

fun topology(builder: StreamsBuilder): Topology {
  val raw: KStream<String, Event> = builder.stream("ingest.raw.v1", Consumed.with(Serdes.String(), eventSerde()))
    .selectKey { _, value -> value.entityId }
  val features: KTable<String, Feature> = builder.table("features.entity.v1", Consumed.with(Serdes.String(), featureSerde()))

  val enriched: KStream<String, Enriched> = raw.leftJoin(features,
    { e -> e.entityId },
    { e, f -> Enriched(e.entityId, e.value, f?.deg ?: 0.0) },
    Joined.with(Serdes.String(), eventSerde(), featureSerde())
  )

  val signals = enriched.mapValues { v -> Score(v.entityId, v.value + v.deg) }

  val partitioner = StreamPartitioner<String, Score> { key, _, partitions ->
    (key.hashCode() and Int.MAX_VALUE) % partitions
  }

  signals.to(
    "signals.scores.v1",
    Produced.with(Serdes.String(), scoreSerde()).withStreamPartitioner(partitioner)
  )

  val alertScores = signals.filter { _, s -> s.score > s.threshold }

  alertScores
    .mapValues { s -> "{\"entityId\":\"${s.entityId}\",\"score\":${s.score}}" }
    .to("alerts.v1", Produced.with(Serdes.String(), Serdes.String()))

  val analytics = alertScores
    .groupByKey(Grouped.with(Serdes.String(), scoreSerde()))
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(1)))
    .count()
    .toStream()
    .map { windowedKey, count ->
      KeyValue(windowedKey.key(), AlertMetric(windowedKey.window().start(), windowedKey.window().end(), count))
    }

  analytics.to("alerts.analytics.v1", Produced.with(Serdes.String(), alertMetricSerde()))

  return builder.build()
}
