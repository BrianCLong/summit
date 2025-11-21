import XCTest
@testable import ACX

final class AdaptiveConsentTests: XCTestCase {
    func testRenderScopesPurposes() throws {
        let pack = PolicyTemplatePack(
            policyId: "test",
            version: "1.0.0",
            defaultLocale: "en-US",
            purposes: [
                PurposeDefinition(id: "analytics", category: "measure", legalBasis: "consent", defaultEnabled: false, description: [:])
            ],
            locales: [
                "en-US": LocaleTemplate(
                    locale: "en-US",
                    title: "Privacy",
                    summary: "We use data.",
                    bulletPoints: ["Analytics"],
                    acceptCta: "Accept",
                    rejectCta: "Reject",
                    manageCta: "Manage",
                    footer: "Update anytime",
                    variantOverrides: nil
                )
            ]
        )

        let sdk = try AdaptiveConsent(pack: pack)
        let dialog = try sdk.render(locale: "en-US", scopedPurposes: ["analytics"])
        XCTAssertEqual(dialog.purposes.first?.id, "analytics")
        XCTAssertEqual(dialog.variant, "control")
    }
}
