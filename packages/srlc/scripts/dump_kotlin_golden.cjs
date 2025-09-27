const KOTLIN_HELPERS = `package com.summit.srlc

import java.security.MessageDigest
import org.apache.kafka.streams.kstream.KStream

object SrlcHelpers {
  private fun assertFormat(value: String?, format: String) {
    if (value == null) return
    when (format) {
      "ssn" -> require(Regex("^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$").matches(value)) { "SRLC format violation for SSN: $value" }
      "iban" -> require(Regex("^[A-Z0-9]{15,34}$").matches(value)) { "SRLC format violation for IBAN: $value" }
      "phone" -> require(Regex("^\\+?[0-9]{10,15}$").matches(value)) { "SRLC format violation for phone: $value" }
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
}`;

function escapeKotlinString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeKotlinChar(value) {
  if (value === '\\') {
    return "\\\\";
  }
  if (value === "'") {
    return "\\'";
  }
  return value;
}

function toPascalCase(value) {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function canonicalTransformSignature(field) {
  return `${field.path}:${field.transforms.map((action) => {
    switch (action.type) {
      case 'mask':
        return `mask(format=${field.format},keep=${action.keep},char=${action.char})`;
      case 'hash':
        return `hash(format=${field.format},algorithm=${action.algorithm},salt=${action.saltScope})`;
      case 'tokenize':
        return `tokenize(format=${field.format},namespace=${action.namespace},preserveFormat=${action.preserveFormat})`;
      case 'generalize':
        return `generalize(format=${field.format},granularity=${action.granularity})`;
      default:
        throw new Error(`Unknown action ${action.type}`);
    }
  }).join(' |> ')}`;
}

function applyKotlinAction(tempVar, action, format) {
  switch (action.type) {
    case 'mask':
      return `${tempVar} = SrlcHelpers.mask(${tempVar}, ${action.keep}, '${escapeKotlinChar(action.char)}', "${format}")`;
    case 'hash':
      return `${tempVar} = SrlcHelpers.hash(${tempVar}, "${action.algorithm}", "${action.saltScope}")`;
    case 'tokenize':
      return `${tempVar} = SrlcHelpers.tokenize(${tempVar}, "${escapeKotlinString(action.namespace)}", ${action.preserveFormat}, "${format}")`;
    case 'generalize':
      return `${tempVar} = SrlcHelpers.generalize(${tempVar}, "${action.granularity}")`;
    default:
      throw new Error(`Unknown action ${action.type}`);
  }
}

function emitKafka(policy) {
  const lines = [];
  lines.push(KOTLIN_HELPERS.trimEnd());
  lines.push('');
  const fnSuffix = toPascalCase(policy.name);
  lines.push(`fun KStream<String, MutableMap<String, Any?>>.applySrlc${fnSuffix}(): KStream<String, MutableMap<String, Any?>> {`);
  lines.push('  return this.mapValues { value ->');
  lines.push('    val result = value.toMutableMap()');
  policy.fields.forEach((field, index) => {
    const key = escapeKotlinString(field.path);
    const tempVar = `current${index}`;
    lines.push(`    var ${tempVar} = value["${key}"] as? String`);
    field.transforms.forEach((action) => {
      lines.push(`    ${applyKotlinAction(tempVar, action, field.format)}`);
    });
    lines.push(`    result["${key}"] = ${tempVar}`);
    lines.push(`    // ${canonicalTransformSignature(field)}`);
  });
  lines.push('    result');
  lines.push('  }');
  lines.push('}');
  return lines.join('\n');
}

const policy = {
  name: 'customer_protection',
  scope: 'session',
  fields: [
    {
      path: 'customer.ssn',
      format: 'ssn',
      transforms: [
        { type: 'mask', keep: 4, char: '#' },
        { type: 'hash', algorithm: 'sha256', saltScope: 'session' }
      ],
      consistency: 'session'
    },
    {
      path: 'account.iban',
      format: 'iban',
      transforms: [
        { type: 'tokenize', namespace: 'payments', preserveFormat: true }
      ],
      consistency: 'global'
    },
    {
      path: 'contact.phone',
      format: 'phone',
      transforms: [
        { type: 'mask', keep: 4, char: '#' },
        { type: 'generalize', granularity: 'region' }
      ],
      consistency: 'session'
    }
  ]
};

process.stdout.write(emitKafka(policy));
