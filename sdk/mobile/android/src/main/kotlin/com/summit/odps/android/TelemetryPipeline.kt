package com.summit.odps.android

/**
 * Coordinates minimisation, consent gates, batching, DP and uploading.
 */
class TelemetryPipeline(
  private val policyPack: PolicyPack,
  private val consentManager: ConsentManager,
  private val networkStateProvider: NetworkStateProvider,
  private val uploader: TelemetryUploader,
  private val batchStorage: BatchStorage = BatchStorage(),
  private val privacyEngine: DifferentialPrivacyEngine = DifferentialPrivacyEngine(),
  private val verifier: TransmissionVerifier? = null
) {

  fun track(event: TelemetryEvent) {
    if (!consentManager.hasConsent()) {
      return
    }

    val filterResult = policyPack.filter(event)
    val sanitizedMetrics = privacyEngine.sanitize(event.metrics, policyPack)
    val envelope = TransmissionEnvelope(
      event = event,
      filteredPayload = filterResult.allowedPayload,
      blockedFields = filterResult.blockedFields,
      blockedSensitiveFields = filterResult.blockedSensitiveFields,
      sanitizedMetrics = sanitizedMetrics
    )
    batchStorage.enqueue(envelope)
    tryFlush()
  }

  fun flush() {
    tryFlush()
  }

  private fun tryFlush() {
    if (!networkStateProvider.isNetworkAvailable()) {
      return
    }

    val batch = batchStorage.drain()
    if (batch.isEmpty()) {
      return
    }

    val result = uploader.upload(batch)
    if (!result.success) {
      batchStorage.requeue(batch)
      return
    }

    verifier?.let { v ->
      batch.forEach { v.recordTransmission(it, policyPack) }
    }
  }
}
