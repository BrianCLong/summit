package com.summit.srlc

import java.security.MessageDigest
import org.apache.kafka.streams.kstream.KStream

object SrlcHelpers {
  private fun assertFormat(value: String?, format: String) {
    if (value == null) return
    when (format) {
      "ssn" -> require(Regex("^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$").matches(value)) { "SRLC format violation for SSN: $value" }
      "iban" -> require(Regex("^[A-Z0-9]{15,34}$").matches(value)) { "SRLC format violation for IBAN: $value" }
      "phone" -> require(Regex("^\+?[0-9]{10,15}$").matches(value)) { "SRLC format violation for phone: $value" }
    }
  }

  fun mask(value: String?, keep: Int, maskChar: Char, format: String): String? {
    if (value == null) return null
    assertFormat(value, format)
    if (keep <= 0) {
      return value.replace(Regex("[A-Za-z0-9]"), maskChar.toString())
    }
    val builder = StringBuilder()
    var visible = 0
    for (ch in value.reversed()) {
      if (ch.isLetterOrDigit()) {
        if (visible < keep) {
          builder.insert(0, ch)
          visible += 1
        } else {
          builder.insert(0, maskChar)
        }
      } else {
        builder.insert(0, ch)
      }
    }
    return builder.toString()
  }

  fun hash(value: String?, algorithm: String, saltScope: String): String? {
    if (value == null) return null
    val salt = if (saltScope == "global") "SRLC_GLOBAL" else "SRLC_SESSION"
    val digest = MessageDigest.getInstance(algorithm.uppercase())
    val hashed = digest.digest((value + salt).toByteArray())
    return hashed.joinToString("") { byte -> "%02x".format(byte) }
  }

  fun tokenize(value: String?, namespace: String, preserveFormat: Boolean, format: String): String? {
    if (value == null) return null
    assertFormat(value, format)
    val digest = MessageDigest.getInstance("SHA-256")
    val hashed = digest.digest(("$namespace:" + value).toByteArray())
    val token = hashed.joinToString("") { byte -> "%02x".format(byte) }
    return if (preserveFormat) token.substring(0, value.length) else token
  }

  fun generalize(value: String?, granularity: String): String? {
    if (value == null) return null
    if (granularity == "none") return value
    return "$granularity::" + value
  }
}

fun KStream<String, MutableMap<String, Any?>>.applySrlcCustomerProtection(): KStream<String, MutableMap<String, Any?>> {
  return this.mapValues { value ->
    val result = value.toMutableMap()
    var current0 = value["customer.ssn"] as? String
    current0 = SrlcHelpers.mask(current0, 4, '#', "ssn")
    current0 = SrlcHelpers.hash(current0, "sha256", "session")
    result["customer.ssn"] = current0
    // customer.ssn:mask(format=ssn,keep=4,char=#) |> hash(format=ssn,algorithm=sha256,salt=session)
    var current1 = value["account.iban"] as? String
    current1 = SrlcHelpers.tokenize(current1, "payments", true, "iban")
    result["account.iban"] = current1
    // account.iban:tokenize(format=iban,namespace=payments,preserveFormat=true)
    var current2 = value["contact.phone"] as? String
    current2 = SrlcHelpers.mask(current2, 4, '#', "phone")
    current2 = SrlcHelpers.generalize(current2, "region")
    result["contact.phone"] = current2
    // contact.phone:mask(format=phone,keep=4,char=#) |> generalize(format=phone,granularity=region)
    result
  }
}