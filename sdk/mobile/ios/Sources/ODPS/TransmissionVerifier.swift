public struct TransmissionRecord: Equatable {
    public let eventId: String
    public let eventType: String
    public let transmittedFields: Set<String>
    public let blockedFields: Set<String>
    public let blockedSensitiveFields: Set<String>
    public let sanitizedMetrics: [String: Double]
    public let expectedTransmittedFields: Set<String>
    public let expectedBlockedFields: Set<String>
    public let expectedSensitiveBlocks: Set<String>
}

public final class TransmissionVerifier {
    private var records: [TransmissionRecord] = []

    public init() {}

    public func record(batch: [TransmissionEnvelope], pack: PolicyPack) {
        for envelope in batch {
            let filtered = pack.filter(event: envelope.event)
            let record = TransmissionRecord(eventId: envelope.event.eventId,
                                            eventType: envelope.event.type,
                                            transmittedFields: Set(envelope.filteredPayload.keys),
                                            blockedFields: envelope.blockedFields,
                                            blockedSensitiveFields: envelope.blockedSensitiveFields,
                                            sanitizedMetrics: Dictionary(uniqueKeysWithValues: envelope.sanitizedMetrics.map { ($0.name, $0.value) }),
                                            expectedTransmittedFields: Set(filtered.allowedPayload.keys),
                                            expectedBlockedFields: filtered.blockedFields,
                                            expectedSensitiveBlocks: filtered.blockedSensitiveFields)
            records.append(record)
        }
    }

    public func report() -> VerificationReport {
        VerificationReport(records: records)
    }
}

public struct VerificationReport {
    private let records: [TransmissionRecord]

    public init(records: [TransmissionRecord]) {
        self.records = records
    }

    public func record(for eventId: String) -> TransmissionRecord? {
        records.first { $0.eventId == eventId }
    }

    public func matchesGroundTruth(eventId: String) -> Bool {
        guard let record = record(for: eventId) else { return false }
        return record.transmittedFields == record.expectedTransmittedFields &&
        record.blockedFields == record.expectedBlockedFields &&
        record.blockedSensitiveFields == record.expectedSensitiveBlocks
    }
}
