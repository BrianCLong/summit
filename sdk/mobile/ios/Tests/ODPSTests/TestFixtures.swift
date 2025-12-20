import Foundation
@testable import ODPS

final class TestNetworkState: NetworkStateProvider {
    var available: Bool

    init(available: Bool) {
        self.available = available
    }

    func isNetworkAvailable() -> Bool {
        available
    }
}

final class TestUploader: TelemetryUploader {
    var batches: [[TransmissionEnvelope]] = []
    var shouldFailOnce: Bool = false

    func upload(batch: [TransmissionEnvelope]) -> UploadResult {
        if shouldFailOnce {
            shouldFailOnce = false
            return UploadResult(success: false, errorMessage: "simulated failure")
        }
        batches.append(batch)
        return UploadResult(success: true)
    }
}

func makePolicyPack() -> PolicyPack {
    let eventPolicy = EventPolicy(eventType: "session_start",
                                  directives: [
                                    "sessionId": FieldDirective(action: .allow),
                                    "appVersion": FieldDirective(action: .allow),
                                    "piiEmail": FieldDirective(action: .deny, isSensitive: true)
                                  ])
    let metrics = [
        "view_count": MetricPolicy(name: "view_count", type: .count, epsilon: 1.0, sensitivity: 1.0),
        "duration_sum": MetricPolicy(name: "duration_sum", type: .sum, epsilon: 0.8, sensitivity: 5.0)
    ]
    return PolicyPack(eventPolicies: ["session_start": eventPolicy], metricPolicies: metrics)
}
