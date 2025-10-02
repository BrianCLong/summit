package com.summit.odps.android

/**
 * Enumerates the action taken on an inbound telemetry field.
 */
enum class FieldAction {
  ALLOW,
  DENY
}

/**
 * Directive describing how a field should be handled before leaving the device.
 */
data class FieldDirective(
  val action: FieldAction,
  val isSensitive: Boolean = false
)

/**
 * Policy for a single event type, mapping field names to directives.
 */
data class EventPolicy(
  val eventType: String,
  val directives: Map<String, FieldDirective>,
  val defaultAction: FieldAction = FieldAction.DENY
) {
  fun filter(payload: Map<String, Any?>): FilterResult {
    val allowed = mutableMapOf<String, Any?>()
    val blocked = mutableSetOf<String>()
    val blockedSensitive = mutableSetOf<String>()

    payload.forEach { (field, value) ->
      val directive = directives[field]
      val action = directive?.action ?: defaultAction
      if (action == FieldAction.ALLOW) {
        allowed[field] = value
      } else {
        blocked += field
        if (directive?.isSensitive == true) {
          blockedSensitive += field
        }
      }
    }

    return FilterResult(
      eventType = eventType,
      allowedPayload = allowed.toMap(),
      blockedFields = blocked,
      blockedSensitiveFields = blockedSensitive
    )
  }
}

/**
 * Result of applying field minimisation policies to an event payload.
 */
data class FilterResult(
  val eventType: String,
  val allowedPayload: Map<String, Any?>,
  val blockedFields: Set<String>,
  val blockedSensitiveFields: Set<String>
)

/**
 * Configuration describing how a metric should be treated locally before upload.
 */
data class MetricPolicy(
  val name: String,
  val type: MetricType,
  val epsilon: Double,
  val sensitivity: Double,
  val enableDifferentialPrivacy: Boolean = true
) {
  init {
    require(epsilon > 0.0) { "epsilon must be positive" }
    require(sensitivity >= 0.0) { "sensitivity must be non-negative" }
  }
}

/**
 * Collection of event and metric policies that can be distributed as a policy pack.
 */
class PolicyPack(
  private val eventPolicies: Map<String, EventPolicy>,
  private val metricPolicies: Map<String, MetricPolicy> = emptyMap(),
  private val defaultEventPolicy: EventPolicy = EventPolicy(
    eventType = "__default__",
    directives = emptyMap(),
    defaultAction = FieldAction.DENY
  )
) {
  fun filter(event: TelemetryEvent): FilterResult {
    val policy = eventPolicies[event.type] ?: defaultEventPolicy
    return policy.filter(event.payload)
  }

  fun metricPolicyFor(name: String): MetricPolicy? = metricPolicies[name]

  fun hasEventPolicy(type: String): Boolean = eventPolicies.containsKey(type)
}
