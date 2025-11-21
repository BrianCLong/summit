import Foundation

public struct PurposeDefinition: Codable, Hashable {
    public let id: String
    public let category: String
    public let legalBasis: String
    public let defaultEnabled: Bool
    public let description: [String: String]
}

public struct LocaleTemplate: Codable {
    public let locale: String
    public let title: String
    public let summary: String
    public let bulletPoints: [String]
    public let acceptCta: String
    public let rejectCta: String
    public let manageCta: String
    public let footer: String
    public let variantOverrides: [String: LocaleOverride]?
}

public struct LocaleOverride: Codable {
    public let title: String?
    public let summary: String?
    public let bulletPoints: [String]?
    public let acceptCta: String?
    public let rejectCta: String?
    public let manageCta: String?
    public let footer: String?
}

public struct PolicyTemplatePack: Codable {
    public let policyId: String
    public let version: String
    public let defaultLocale: String
    public let purposes: [PurposeDefinition]
    public let locales: [String: LocaleTemplate]
}

public struct ConsentDialog: Codable {
    public let locale: String
    public let title: String
    public let summary: String
    public let bulletPoints: [String]
    public let acceptCta: String
    public let rejectCta: String
    public let manageCta: String
    public let footer: String
    public let purposes: [PurposeDefinition]
    public let policyId: String
    public let policyVersion: String
    public let variant: String
}

public struct PurposeScope: Codable {
    public let id: String
    public let enabled: Bool
}

public enum AdaptiveConsentError: Error {
    case darkPatternFound(pattern: String)
    case missingLocale
}

public final class AdaptiveConsent {
    private let pack: PolicyTemplatePack
    private let disallowedPatterns: [String]

    public init(pack: PolicyTemplatePack, disallowedPatterns: [String] = ["preselected", "you must accept"]) throws {
        self.pack = pack
        self.disallowedPatterns = disallowedPatterns
        try validate()
    }

    private func validate() throws {
        for (locale, template) in pack.locales {
            try inspect(locale: locale, template: template)
        }
    }

    private func inspect(locale: String, template: LocaleTemplate) throws {
        try inspect(locale: locale, value: template.title)
        try inspect(locale: locale, value: template.summary)
        try template.bulletPoints.forEach { try inspect(locale: locale, value: $0) }
        if let overrides = template.variantOverrides {
            for override in overrides.values {
                if let summary = override.summary {
                    try inspect(locale: locale, value: summary)
                }
            }
        }
    }

    private func inspect(locale: String, value: String) throws {
        for pattern in disallowedPatterns where value.lowercased().contains(pattern) {
            throw AdaptiveConsentError.darkPatternFound(pattern: pattern)
        }
    }

    public func render(locale: String, scopedPurposes: [String]? = nil) throws -> ConsentDialog {
        guard let template = pack.locales[locale] ?? pack.locales[pack.defaultLocale] else {
            throw AdaptiveConsentError.missingLocale
        }
        let purposes = scope(purposes: pack.purposes, requested: scopedPurposes)
        return ConsentDialog(
            locale: template.locale,
            title: template.title,
            summary: template.summary,
            bulletPoints: template.bulletPoints,
            acceptCta: template.acceptCta,
            rejectCta: template.rejectCta,
            manageCta: template.manageCta,
            footer: template.footer,
            purposes: purposes,
            policyId: pack.policyId,
            policyVersion: pack.version,
            variant: "control"
        )
    }

    private func scope(purposes: [PurposeDefinition], requested: [String]?) -> [PurposeDefinition] {
        guard let requested else { return purposes }
        let set = Set(requested)
        return purposes.filter { set.contains($0.id) }
    }
}
