package com.summit.acx

import java.security.KeyFactory
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Signature
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

public data class PurposeDefinition(
    val id: String,
    val category: String,
    val legalBasis: String,
    val defaultEnabled: Boolean,
    val description: Map<String, String>
)

public data class LocaleOverride(
    val title: String? = null,
    val summary: String? = null,
    val bulletPoints: List<String>? = null,
    val acceptCta: String? = null,
    val rejectCta: String? = null,
    val manageCta: String? = null,
    val footer: String? = null
)

public data class LocaleTemplate(
    val locale: String,
    val title: String,
    val summary: String,
    val bulletPoints: List<String>,
    val acceptCta: String,
    val rejectCta: String,
    val manageCta: String,
    val footer: String,
    val variantOverrides: Map<String, LocaleOverride>? = null
)

public data class PolicyTemplatePack(
    val policyId: String,
    val version: String,
    val defaultLocale: String,
    val purposes: List<PurposeDefinition>,
    val locales: Map<String, LocaleTemplate>
)

public data class ConsentDialog(
    val locale: String,
    val title: String,
    val summary: String,
    val bulletPoints: List<String>,
    val acceptCta: String,
    val rejectCta: String,
    val manageCta: String,
    val footer: String,
    val purposes: List<PurposeDefinition>,
    val policyId: String,
    val policyVersion: String,
    val variant: String
)

public data class PurposeScope(val id: String, val enabled: Boolean)

public data class ConsentRecord(
    val policyId: String,
    val policyVersion: String,
    val userId: String,
    val locale: String,
    val decision: String,
    val purposes: List<PurposeScope>,
    val timestamp: String,
    val variant: String
)

public data class ConsentArtifact(
    val algorithm: String,
    val signature: String,
    val payload: ConsentRecord
)

public class DarkPatternException(message: String) : Exception(message)

public class AdaptiveConsent(
    private val pack: PolicyTemplatePack,
    private val disallowed: List<String> = listOf("preselected", "you must accept")
) {
    init {
        validate()
    }

    private fun validate() {
        pack.locales.forEach { (locale, template) ->
            inspect(locale, template.title)
            inspect(locale, template.summary)
            template.bulletPoints.forEach { inspect(locale, it) }
            template.variantOverrides?.values?.forEach { override ->
                override.summary?.let { inspect(locale, it) }
            }
        }
    }

    private fun inspect(locale: String, text: String) {
        disallowed.forEach {
            if (text.lowercase().contains(it)) {
                throw DarkPatternException("$locale contains disallowed pattern $it")
            }
        }
    }

    public fun render(locale: String, scopedPurposes: List<String>? = null): ConsentDialog {
        val template = pack.locales[locale] ?: pack.locales[pack.defaultLocale]
            ?: throw IllegalArgumentException("Locale $locale not found")
        val purposes = if (scopedPurposes == null) {
            pack.purposes
        } else {
            val set = scopedPurposes.toSet()
            pack.purposes.filter { set.contains(it.id) }
        }
        return ConsentDialog(
            locale = template.locale,
            title = template.title,
            summary = template.summary,
            bulletPoints = template.bulletPoints,
            acceptCta = template.acceptCta,
            rejectCta = template.rejectCta,
            manageCta = template.manageCta,
            footer = template.footer,
            purposes = purposes,
            policyId = pack.policyId,
            policyVersion = pack.version,
            variant = "control"
        )
    }

    public fun sign(record: ConsentRecord, privateKeyPem: String): ConsentArtifact {
        val privateKey = decodePrivateKey(privateKeyPem)
        val signature = Signature.getInstance("SHA256withRSA")
        signature.initSign(privateKey)
        signature.update(record.toString().toByteArray(Charsets.UTF_8))
        val signed = Base64.getEncoder().encodeToString(signature.sign())
        return ConsentArtifact("SHA256withRSA", signed, record)
    }

    public fun verify(artifact: ConsentArtifact, publicKeyPem: String): Boolean {
        val publicKey = decodePublicKey(publicKeyPem)
        val signature = Signature.getInstance("SHA256withRSA")
        signature.initVerify(publicKey)
        signature.update(artifact.payload.toString().toByteArray(Charsets.UTF_8))
        return signature.verify(Base64.getDecoder().decode(artifact.signature))
    }

    private fun decodePrivateKey(pem: String): PrivateKey {
        val content = pem
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replace("\n", "")
        val bytes = Base64.getDecoder().decode(content)
        val spec = PKCS8EncodedKeySpec(bytes)
        return KeyFactory.getInstance("RSA").generatePrivate(spec)
    }

    private fun decodePublicKey(pem: String): PublicKey {
        val content = pem
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace("\n", "")
        val bytes = Base64.getDecoder().decode(content)
        val spec = X509EncodedKeySpec(bytes)
        return KeyFactory.getInstance("RSA").generatePublic(spec)
    }
}
