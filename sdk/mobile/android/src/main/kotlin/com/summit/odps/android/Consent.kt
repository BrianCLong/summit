package com.summit.odps.android

/**
 * Tracks the consent state for telemetry collection.
 */
enum class ConsentState {
  GRANTED,
  DENIED,
  UNKNOWN
}

class ConsentManager(initialState: ConsentState = ConsentState.UNKNOWN) {
  @Volatile
  private var state: ConsentState = initialState

  fun updateConsent(newState: ConsentState) {
    state = newState
  }

  fun hasConsent(): Boolean = state == ConsentState.GRANTED
}
