package com.summit.odps.android

import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class TelemetryPipelineTest {
  private fun policyPack(): PolicyPack {
    val sessionPolicy = EventPolicy(
      eventType = "session_start",
      directives = mapOf(
        "sessionId" to FieldDirective(FieldAction.ALLOW),
        "appVersion" to FieldDirective(FieldAction.ALLOW),
        "piiEmail" to FieldDirective(FieldAction.DENY, isSensitive = true)
      )
    )
    val metricPolicies = mapOf(
      "view_count" to MetricPolicy("view_count", MetricType.COUNT, epsilon = 1.0, sensitivity = 1.0),
      "duration_sum" to MetricPolicy("duration_sum", MetricType.SUM, epsilon = 0.8, sensitivity = 5.0)
    )
    return PolicyPack(mapOf(sessionPolicy.eventType to sessionPolicy), metricPolicies)
  }

  @Test
  fun `seeded PII fields never transmit when disallowed`() {
    val consentManager = ConsentManager().apply { updateConsent(ConsentState.GRANTED) }
    val network = TestNetworkState(available = true)
    val uploader = TestUploader()
    val verifier = TransmissionVerifier()
    val pipeline = TelemetryPipeline(
      policyPack = policyPack(),
      consentManager = consentManager,
      networkStateProvider = network,
      uploader = uploader,
      privacyEngine = DifferentialPrivacyEngine(SeededLaplaceNoiseGenerator(seed = 1)),
      verifier = verifier
    )

    val event = TelemetryEvent(
      eventId = "evt-1",
      type = "session_start",
      payload = mapOf(
        "sessionId" to "abc",
        "appVersion" to "1.0.0",
        "piiEmail" to "secret@example.com"
      )
    )

    pipeline.track(event)

    assertEquals(1, uploader.batches.size)
    val stored = uploader.batches.first().first()
    assertFalse(stored.filteredPayload.containsKey("piiEmail"))
    assertTrue("piiEmail" in stored.blockedSensitiveFields)

    val report = verifier.report()
    val record = report.forEvent("evt-1")
    assertNotNull(record)
    assertTrue(report.matchesGroundTruth("evt-1"))
  }

  @Test
  fun `local DP metrics meet configured error bounds`() {
    val consentManager = ConsentManager().apply { updateConsent(ConsentState.GRANTED) }
    val network = TestNetworkState(available = true)
    val uploader = TestUploader()
    val pack = policyPack()
    val dpEngine = DifferentialPrivacyEngine(SeededLaplaceNoiseGenerator(seed = 7))
    val pipeline = TelemetryPipeline(
      policyPack = pack,
      consentManager = consentManager,
      networkStateProvider = network,
      uploader = uploader,
      privacyEngine = dpEngine
    )

    val event = TelemetryEvent(
      eventId = "evt-2",
      type = "session_start",
      metrics = listOf(
        Metric("view_count", MetricType.COUNT, 10.0),
        Metric("duration_sum", MetricType.SUM, 120.0)
      )
    )

    pipeline.track(event)

    val batch = uploader.batches.last()
    val sanitized = batch.first().sanitizedMetrics.associateBy { it.name }

    val countPolicy = pack.metricPolicyFor("view_count")!!
    val durationPolicy = pack.metricPolicyFor("duration_sum")!!

    val countBound = dpEngine.errorBound(countPolicy, confidence = 0.95)
    val durationBound = dpEngine.errorBound(durationPolicy, confidence = 0.95)

    val countNoise = abs(sanitized.getValue("view_count").value - 10.0)
    val durationNoise = abs(sanitized.getValue("duration_sum").value - 120.0)

    assertTrue(countNoise <= countBound, "count noise $countNoise should be within bound $countBound")
    assertTrue(durationNoise <= durationBound, "duration noise $durationNoise should be within bound $durationBound")
  }

  @Test
  fun `verifier report matches ground truth across simulated sessions`() {
    val consentManager = ConsentManager().apply { updateConsent(ConsentState.GRANTED) }
    val network = TestNetworkState(available = false)
    val uploader = TestUploader()
    val verifier = TransmissionVerifier()
    val pack = policyPack()
    val pipeline = TelemetryPipeline(
      policyPack = pack,
      consentManager = consentManager,
      networkStateProvider = network,
      uploader = uploader,
      privacyEngine = DifferentialPrivacyEngine(SeededLaplaceNoiseGenerator(seed = 11)),
      verifier = verifier
    )

    val first = TelemetryEvent(
      eventId = "evt-3",
      type = "session_start",
      payload = mapOf(
        "sessionId" to "offline-1",
        "appVersion" to "2.0",
        "piiEmail" to "blocked@example.com"
      )
    )
    val second = TelemetryEvent(
      eventId = "evt-4",
      type = "session_start",
      payload = mapOf(
        "sessionId" to "offline-2",
        "appVersion" to "2.1",
        "piiEmail" to "blocked2@example.com"
      ),
      metrics = listOf(Metric("view_count", MetricType.COUNT, 4.0))
    )

    pipeline.track(first)
    pipeline.track(second)

    assertEquals(0, uploader.batches.size)

    network.available = true
    pipeline.flush()

    assertEquals(1, uploader.batches.size)
    val report = verifier.report()
    assertTrue(report.matchesGroundTruth("evt-3"))
    assertTrue(report.matchesGroundTruth("evt-4"))
  }
}
