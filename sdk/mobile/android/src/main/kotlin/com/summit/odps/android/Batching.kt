package com.summit.odps.android

fun interface NetworkStateProvider {
  fun isNetworkAvailable(): Boolean
}

fun interface TelemetryUploader {
  fun upload(batch: List<TransmissionEnvelope>): UploadResult
}

data class UploadResult(
  val success: Boolean,
  val errorMessage: String? = null
)

data class TransmissionEnvelope(
  val event: TelemetryEvent,
  val filteredPayload: Map<String, Any?>,
  val blockedFields: Set<String>,
  val blockedSensitiveFields: Set<String>,
  val sanitizedMetrics: List<Metric>
)

class BatchStorage {
  private val queue: ArrayDeque<TransmissionEnvelope> = ArrayDeque()

  @Synchronized
  fun enqueue(envelope: TransmissionEnvelope) {
    queue.addLast(envelope)
  }

  @Synchronized
  fun drain(): List<TransmissionEnvelope> {
    if (queue.isEmpty()) return emptyList()
    val drained = queue.toList()
    queue.clear()
    return drained
  }

  @Synchronized
  fun requeue(items: List<TransmissionEnvelope>) {
    if (items.isEmpty()) return
    val existing = ArrayDeque<TransmissionEnvelope>()
    existing.addAll(items)
    existing.addAll(queue)
    queue.clear()
    queue.addAll(existing)
  }

  @Synchronized
  fun size(): Int = queue.size
}
