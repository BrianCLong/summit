package com.summit.odps.android

import java.util.UUID

/**
 * Describes a telemetry event collected by the ODPS pipeline.
 */
data class TelemetryEvent(
  val eventId: String = UUID.randomUUID().toString(),
  val type: String,
  val payload: Map<String, Any?> = emptyMap(),
  val metrics: List<Metric> = emptyList()
)

/**
 * Supported metric aggregation types that can be protected via local differential privacy.
 */
enum class MetricType {
  COUNT,
  SUM
}

/**
 * Numeric metric emitted from the device prior to local-DP sanitisation.
 */
data class Metric(
  val name: String,
  val type: MetricType,
  val value: Double
)
