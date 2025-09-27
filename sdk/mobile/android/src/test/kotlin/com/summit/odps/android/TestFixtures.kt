package com.summit.odps.android

import kotlin.random.Random

class TestNetworkState(var available: Boolean) : NetworkStateProvider {
  override fun isNetworkAvailable(): Boolean = available
}

class TestUploader : TelemetryUploader {
  val batches = mutableListOf<List<TransmissionEnvelope>>()
  var shouldFailOnce: Boolean = false

  override fun upload(batch: List<TransmissionEnvelope>): UploadResult {
    if (shouldFailOnce) {
      shouldFailOnce = false
      return UploadResult(success = false, errorMessage = "simulated failure")
    }
    batches += batch.map { it.copy() }
    return UploadResult(success = true)
  }
}

class SeededLaplaceNoiseGenerator(seed: Int) : NoiseGenerator {
  private val random = Random(seed)
  override fun sample(scale: Double): Double {
    if (scale == 0.0) return 0.0
    val u = random.nextDouble() - 0.5
    val magnitude = kotlin.math.ln(1 - 2 * kotlin.math.abs(u)) * -scale
    return kotlin.math.sign(u) * magnitude
  }
}
