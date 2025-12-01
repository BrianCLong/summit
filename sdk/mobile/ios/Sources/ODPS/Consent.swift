public enum ConsentState {
    case granted
    case denied
    case unknown
}

public final class ConsentManager {
    private var state: ConsentState

    public init(initialState: ConsentState = .unknown) {
        self.state = initialState
    }

    public func update(_ newState: ConsentState) {
        state = newState
    }

    public func hasConsent() -> Bool {
        state == .granted
    }
}
