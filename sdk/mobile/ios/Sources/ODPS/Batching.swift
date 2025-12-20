import Foundation

public protocol NetworkStateProvider {
    func isNetworkAvailable() -> Bool
}

public protocol TelemetryUploader {
    func upload(batch: [TransmissionEnvelope]) -> UploadResult
}

public struct UploadResult {
    public let success: Bool
    public let errorMessage: String?

    public init(success: Bool, errorMessage: String? = nil) {
        self.success = success
        self.errorMessage = errorMessage
    }
}

public struct TransmissionEnvelope: Equatable {
    public let event: TelemetryEvent
    public let filteredPayload: [String: AnyHashable]
    public let blockedFields: Set<String>
    public let blockedSensitiveFields: Set<String>
    public let sanitizedMetrics: [Metric]

    public init(event: TelemetryEvent,
                filteredPayload: [String: AnyHashable],
                blockedFields: Set<String>,
                blockedSensitiveFields: Set<String>,
                sanitizedMetrics: [Metric]) {
        self.event = event
        self.filteredPayload = filteredPayload
        self.blockedFields = blockedFields
        self.blockedSensitiveFields = blockedSensitiveFields
        self.sanitizedMetrics = sanitizedMetrics
    }
}

public final class BatchStorage {
    private var queue: [TransmissionEnvelope] = []
    private let lock = NSLock()

    public init() {}

    public func enqueue(_ envelope: TransmissionEnvelope) {
        lock.lock(); defer { lock.unlock() }
        queue.append(envelope)
    }

    public func drain() -> [TransmissionEnvelope] {
        lock.lock(); defer { lock.unlock() }
        let drained = queue
        queue.removeAll()
        return drained
    }

    public func requeue(_ envelopes: [TransmissionEnvelope]) {
        guard !envelopes.isEmpty else { return }
        lock.lock(); defer { lock.unlock() }
        queue = envelopes + queue
    }
}
