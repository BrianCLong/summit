package com.summit.odps.android

import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.sign
import kotlin.math.roundToInt
import kotlin.random.Random

/**
 * Interface for generating Laplace noise samples.
 */
fun interface NoiseGenerator {
  fun sample(scale: Double): Double
}

class LaplaceNoiseGenerator(private val random: Random = Random.Default) : NoiseGenerator {
  override fun sample(scale: Double): Double {
    if (scale == 0.0) return 0.0
    val u = random.nextDouble() - 0.5
    val magnitude = ln(1 - 2 * abs(u)) * -scale
    return sign(u) * magnitude
  }
}

/**
 * Applies per-metric Laplace noise prior to upload.
 */
class DifferentialPrivacyEngine(
  private val noiseGenerator: NoiseGenerator = LaplaceNoiseGenerator()
) {
  fun sanitize(metrics: List<Metric>, policyPack: PolicyPack): List<Metric> {
    if (metrics.isEmpty()) return metrics
    return metrics.map { metric ->
      val policy = policyPack.metricPolicyFor(metric.name)
      if (policy == null) {
        metric
      } else if (!policy.enableDifferentialPrivacy) {
        metric
      } else {
        val scale = if (policy.epsilon == 0.0) 0.0 else policy.sensitivity / policy.epsilon
        val noise = noiseGenerator.sample(scale)
        val sanitised = when (policy.type) {
          MetricType.COUNT -> max(0.0, (metric.value + noise)).roundToInt().toDouble()
          MetricType.SUM -> metric.value + noise
        }
        metric.copy(value = sanitised)
      }
    }
  }

  fun errorBound(policy: MetricPolicy, confidence: Double): Double {
    require(confidence in 0.0..1.0) { "confidence must be between 0 and 1" }
    val clamped = confidence.coerceIn(0.0, 0.999999)
    val scale = if (policy.epsilon == 0.0) 0.0 else policy.sensitivity / policy.epsilon
    if (scale == 0.0) return 0.0
    return scale * ln(1.0 / (1.0 - clamped))
  }
}
