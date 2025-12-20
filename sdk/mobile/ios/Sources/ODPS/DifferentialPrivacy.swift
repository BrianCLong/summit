import Foundation

public struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    public init(seed: UInt64) {
        self.state = seed == 0 ? 1 : seed
    }

    public mutating func next() -> UInt64 {
        state = 2862933555777941757 &* state &+ 3037000493
        return state
    }
}

public struct LaplaceNoiseGenerator {
    private var rng: SeededGenerator

    public init(seed: UInt64) {
        self.rng = SeededGenerator(seed: seed)
    }

    public mutating func sample(scale: Double) -> Double {
        guard scale > 0 else { return 0 }
        let uniform = Double.random(in: 0..<1, using: &rng) - 0.5
        let magnitude = log(1 - 2 * abs(uniform)) * -scale
        return (uniform >= 0 ? 1.0 : -1.0) * magnitude
    }
}

public final class DifferentialPrivacyEngine {
    private var noiseGenerator: LaplaceNoiseGenerator

    public init(noiseGenerator: LaplaceNoiseGenerator) {
        self.noiseGenerator = noiseGenerator
    }

    public convenience init(seed: UInt64 = 1) {
        self.init(noiseGenerator: LaplaceNoiseGenerator(seed: seed))
    }

    public func sanitize(metrics: [Metric], pack: PolicyPack) -> [Metric] {
        guard !metrics.isEmpty else { return metrics }
        var sanitized: [Metric] = []
        var generator = noiseGenerator

        for metric in metrics {
            guard let policy = pack.metricPolicy(for: metric.name) else {
                sanitized.append(metric)
                continue
            }
            guard policy.enableDifferentialPrivacy else {
                sanitized.append(metric)
                continue
            }
            let scale = policy.sensitivity / policy.epsilon
            var localGenerator = generator
            let noise = localGenerator.sample(scale: scale)
            generator = localGenerator

            switch policy.type {
            case .count:
                let noisy = max(0, Int(round(metric.value + noise)))
                sanitized.append(Metric(name: metric.name, type: .count, value: Double(noisy)))
            case .sum:
                sanitized.append(Metric(name: metric.name, type: .sum, value: metric.value + noise))
            }
        }
        noiseGenerator = generator
        return sanitized
    }

    public func errorBound(for policy: MetricPolicy, confidence: Double) -> Double {
        precondition(confidence >= 0 && confidence <= 1, "confidence must be in [0,1]")
        if policy.epsilon == 0 { return 0 }
        let scale = policy.sensitivity / policy.epsilon
        if scale == 0 { return 0 }
        let clamped = min(confidence, 0.999999)
        return scale * log(1 / (1 - clamped))
    }
}
