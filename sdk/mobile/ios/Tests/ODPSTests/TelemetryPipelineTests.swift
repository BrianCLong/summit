import XCTest
@testable import ODPS

final class TelemetryPipelineTests: XCTestCase {
    func testSeededPIINeverTransmitsWhenDisallowed() {
        let consent = ConsentManager(initialState: .granted)
        let network = TestNetworkState(available: true)
        let uploader = TestUploader()
        let verifier = TransmissionVerifier()
        let pipeline = TelemetryPipeline(policyPack: makePolicyPack(),
                                         consentManager: consent,
                                         networkProvider: network,
                                         uploader: uploader,
                                         privacyEngine: DifferentialPrivacyEngine(seed: 1),
                                         verifier: verifier)

        let event = TelemetryEvent(eventId: "evt-ios-1",
                                   type: "session_start",
                                   payload: [
                                    "sessionId": "abc",
                                    "appVersion": "1.0.0",
                                    "piiEmail": "secret@example.com"
                                   ])

        pipeline.track(event: event)

        XCTAssertEqual(uploader.batches.count, 1)
        let stored = uploader.batches.first!.first!
        XCTAssertNil(stored.filteredPayload["piiEmail"])
        XCTAssertTrue(stored.blockedSensitiveFields.contains("piiEmail"))
        XCTAssertTrue(verifier.report().matchesGroundTruth(eventId: "evt-ios-1"))
    }

    func testLocalDPMetricsWithinErrorBounds() {
        let consent = ConsentManager(initialState: .granted)
        let network = TestNetworkState(available: true)
        let uploader = TestUploader()
        let pack = makePolicyPack()
        let engine = DifferentialPrivacyEngine(seed: 7)
        let pipeline = TelemetryPipeline(policyPack: pack,
                                         consentManager: consent,
                                         networkProvider: network,
                                         uploader: uploader,
                                         privacyEngine: engine)

        let event = TelemetryEvent(eventId: "evt-ios-2",
                                   type: "session_start",
                                   metrics: [
                                    Metric(name: "view_count", type: .count, value: 10),
                                    Metric(name: "duration_sum", type: .sum, value: 120)
                                   ])

        pipeline.track(event: event)

        let batch = uploader.batches.last!
        let metrics = Dictionary(uniqueKeysWithValues: batch.first!.sanitizedMetrics.map { ($0.name, $0.value) })

        let countPolicy = pack.metricPolicy(for: "view_count")!
        let durationPolicy = pack.metricPolicy(for: "duration_sum")!

        let countNoise = abs(metrics["view_count"]! - 10)
        let durationNoise = abs(metrics["duration_sum"]! - 120)

        XCTAssertLessThanOrEqual(countNoise, engine.errorBound(for: countPolicy, confidence: 0.95))
        XCTAssertLessThanOrEqual(durationNoise, engine.errorBound(for: durationPolicy, confidence: 0.95))
    }

    func testVerifierMatchesGroundTruthAcrossSessions() {
        let consent = ConsentManager(initialState: .granted)
        let network = TestNetworkState(available: false)
        let uploader = TestUploader()
        let verifier = TransmissionVerifier()
        let pack = makePolicyPack()
        let pipeline = TelemetryPipeline(policyPack: pack,
                                         consentManager: consent,
                                         networkProvider: network,
                                         uploader: uploader,
                                         privacyEngine: DifferentialPrivacyEngine(seed: 11),
                                         verifier: verifier)

        let first = TelemetryEvent(eventId: "evt-ios-3",
                                   type: "session_start",
                                   payload: [
                                    "sessionId": "offline-1",
                                    "appVersion": "2.0",
                                    "piiEmail": "blocked@example.com"
                                   ])
        let second = TelemetryEvent(eventId: "evt-ios-4",
                                    type: "session_start",
                                    payload: [
                                     "sessionId": "offline-2",
                                     "appVersion": "2.1",
                                     "piiEmail": "blocked2@example.com"
                                    ],
                                    metrics: [Metric(name: "view_count", type: .count, value: 4)])

        pipeline.track(event: first)
        pipeline.track(event: second)
        XCTAssertEqual(uploader.batches.count, 0)

        network.available = true
        pipeline.flush()

        XCTAssertEqual(uploader.batches.count, 1)
        XCTAssertTrue(verifier.report().matchesGroundTruth(eventId: "evt-ios-3"))
        XCTAssertTrue(verifier.report().matchesGroundTruth(eventId: "evt-ios-4"))
    }
}
