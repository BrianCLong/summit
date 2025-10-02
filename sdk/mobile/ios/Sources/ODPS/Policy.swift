import Foundation

public enum FieldAction {
    case allow
    case deny
}

public struct FieldDirective {
    public let action: FieldAction
    public let isSensitive: Bool

    public init(action: FieldAction, isSensitive: Bool = false) {
        self.action = action
        self.isSensitive = isSensitive
    }
}

public struct EventPolicy {
    public let eventType: String
    public let directives: [String: FieldDirective]
    public let defaultAction: FieldAction

    public init(eventType: String,
                directives: [String: FieldDirective],
                defaultAction: FieldAction = .deny) {
        self.eventType = eventType
        self.directives = directives
        self.defaultAction = defaultAction
    }

    func filter(payload: [String: AnyHashable]) -> FilterResult {
        var allowed: [String: AnyHashable] = [:]
        var blocked = Set<String>()
        var blockedSensitive = Set<String>()

        for (field, value) in payload {
            let directive = directives[field]
            let action = directive?.action ?? defaultAction
            if action == .allow {
                allowed[field] = value
            } else {
                blocked.insert(field)
                if directive?.isSensitive == true {
                    blockedSensitive.insert(field)
                }
            }
        }

        return FilterResult(eventType: eventType,
                             allowedPayload: allowed,
                             blockedFields: blocked,
                             blockedSensitiveFields: blockedSensitive)
    }
}

public struct FilterResult {
    public let eventType: String
    public let allowedPayload: [String: AnyHashable]
    public let blockedFields: Set<String>
    public let blockedSensitiveFields: Set<String>
}

public struct MetricPolicy {
    public let name: String
    public let type: MetricType
    public let epsilon: Double
    public let sensitivity: Double
    public let enableDifferentialPrivacy: Bool

    public init(name: String,
                type: MetricType,
                epsilon: Double,
                sensitivity: Double,
                enableDifferentialPrivacy: Bool = true) {
        precondition(epsilon > 0, "epsilon must be positive")
        precondition(sensitivity >= 0, "sensitivity must be non-negative")
        self.name = name
        self.type = type
        self.epsilon = epsilon
        self.sensitivity = sensitivity
        self.enableDifferentialPrivacy = enableDifferentialPrivacy
    }
}

public final class PolicyPack {
    private let eventPolicies: [String: EventPolicy]
    private let metricPolicies: [String: MetricPolicy]
    private let defaultPolicy: EventPolicy

    public init(eventPolicies: [String: EventPolicy],
                metricPolicies: [String: MetricPolicy] = [:]) {
        self.eventPolicies = eventPolicies
        self.metricPolicies = metricPolicies
        self.defaultPolicy = EventPolicy(eventType: "__default__", directives: [:], defaultAction: .deny)
    }

    public func filter(event: TelemetryEvent) -> FilterResult {
        let policy = eventPolicies[event.type] ?? defaultPolicy
        return policy.filter(payload: event.payload)
    }

    public func metricPolicy(for name: String) -> MetricPolicy? {
        metricPolicies[name]
    }
}
