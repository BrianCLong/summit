import Foundation

public struct TelemetryEvent: Equatable {
    public let eventId: String
    public let type: String
    public let payload: [String: AnyHashable]
    public let metrics: [Metric]

    public init(eventId: String = UUID().uuidString,
                type: String,
                payload: [String: AnyHashable] = [:],
                metrics: [Metric] = []) {
        self.eventId = eventId
        self.type = type
        self.payload = payload
        self.metrics = metrics
    }
}

public enum MetricType {
    case count
    case sum
}

public struct Metric: Equatable {
    public let name: String
    public let type: MetricType
    public let value: Double

    public init(name: String, type: MetricType, value: Double) {
        self.name = name
        self.type = type
        self.value = value
    }
}
