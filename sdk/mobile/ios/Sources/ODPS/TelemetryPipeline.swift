public final class TelemetryPipeline {
    private let policyPack: PolicyPack
    private let consentManager: ConsentManager
    private let networkProvider: NetworkStateProvider
    private let uploader: TelemetryUploader
    private let storage: BatchStorage
    private let privacyEngine: DifferentialPrivacyEngine
    private let verifier: TransmissionVerifier?

    public init(policyPack: PolicyPack,
                consentManager: ConsentManager,
                networkProvider: NetworkStateProvider,
                uploader: TelemetryUploader,
                storage: BatchStorage = BatchStorage(),
                privacyEngine: DifferentialPrivacyEngine = DifferentialPrivacyEngine(),
                verifier: TransmissionVerifier? = nil) {
        self.policyPack = policyPack
        self.consentManager = consentManager
        self.networkProvider = networkProvider
        self.uploader = uploader
        self.storage = storage
        self.privacyEngine = privacyEngine
        self.verifier = verifier
    }

    public func track(event: TelemetryEvent) {
        guard consentManager.hasConsent() else { return }
        let filterResult = policyPack.filter(event: event)
        let sanitizedMetrics = privacyEngine.sanitize(metrics: event.metrics, pack: policyPack)
        let envelope = TransmissionEnvelope(event: event,
                                            filteredPayload: filterResult.allowedPayload,
                                            blockedFields: filterResult.blockedFields,
                                            blockedSensitiveFields: filterResult.blockedSensitiveFields,
                                            sanitizedMetrics: sanitizedMetrics)
        storage.enqueue(envelope)
        flush()
    }

    public func flush() {
        guard networkProvider.isNetworkAvailable() else { return }
        let batch = storage.drain()
        guard !batch.isEmpty else { return }
        let result = uploader.upload(batch: batch)
        guard result.success else {
            storage.requeue(batch)
            return
        }
        verifier?.record(batch: batch, pack: policyPack)
    }
}
