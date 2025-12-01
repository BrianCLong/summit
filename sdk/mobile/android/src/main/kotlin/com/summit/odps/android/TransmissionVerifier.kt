package com.summit.odps.android

/**
 * Creates auditable reports describing which fields left the device.
 */
class TransmissionVerifier {
  private val transmissions = mutableListOf<TransmissionRecord>()

  fun recordTransmission(envelope: TransmissionEnvelope, policyPack: PolicyPack) {
    val filtered = policyPack.filter(envelope.event)
    transmissions += TransmissionRecord(
      eventId = envelope.event.eventId,
      eventType = envelope.event.type,
      transmittedFields = envelope.filteredPayload.keys.toSet(),
      blockedFields = envelope.blockedFields,
      blockedSensitiveFields = envelope.blockedSensitiveFields,
      sanitizedMetrics = envelope.sanitizedMetrics.associate { it.name to it.value },
      expectedTransmittedFields = filtered.allowedPayload.keys.toSet(),
      expectedBlockedFields = filtered.blockedFields,
      expectedSensitiveBlocks = filtered.blockedSensitiveFields
    )
  }

  fun report(): VerificationReport = VerificationReport(transmissions.toList())
}

data class TransmissionRecord(
  val eventId: String,
  val eventType: String,
  val transmittedFields: Set<String>,
  val blockedFields: Set<String>,
  val blockedSensitiveFields: Set<String>,
  val sanitizedMetrics: Map<String, Double>,
  val expectedTransmittedFields: Set<String>,
  val expectedBlockedFields: Set<String>,
  val expectedSensitiveBlocks: Set<String>
)

class VerificationReport(private val records: List<TransmissionRecord>) {
  fun forEvent(eventId: String): TransmissionRecord? = records.firstOrNull { it.eventId == eventId }

  fun matchesGroundTruth(eventId: String): Boolean {
    val record = forEvent(eventId) ?: return false
    return record.transmittedFields == record.expectedTransmittedFields &&
      record.blockedFields == record.expectedBlockedFields &&
      record.blockedSensitiveFields == record.expectedSensitiveBlocks
  }

  fun entries(): List<TransmissionRecord> = records
}
