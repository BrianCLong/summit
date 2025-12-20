# Behavioral Telemetry Insights

## Overview
* **Sessions analyzed:** 30
* **Unique users:** 21
* **High-intensity investigative sessions:** 3
* **Long-form scanning sessions:** 1

## Adaptive UX Opportunities

### Device performance spread
| Device | Avg latency (ms) | P50 latency | P90 latency | Avg clicks/min | P50 clicks/min | P90 clicks/min | Avg scroll % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| desktop | 193.48 | 205.0 | 230.0 | 13.91 | 11.23 | 13.5 | 62.95 |
| tablet | 310.0 | 310.0 | 320.0 | 5.24 | 5.54 | 5.76 | 56.6 |
| mobile | 397.5 | 405.0 | 410.0 | 4.96 | 5.16 | 5.18 | 46.0 |

### Role focus and intensity
| Role | Avg focus ratio | Avg interaction intensity |
| --- | ---: | ---: |
| threat_analyst | 0.25 | 17.42 |
| operations | 0.20 | 4.93 |
| executive | 0.18 | 2.86 |
| viewer | 0.16 | 1.72 |
| unknown | 0.04 | 52.52 |

### Peak engagement windows
| Hour (UTC) | Session count |
| ---: | ---: |
| 09:00 | 2 |
| 13:00 | 2 |
| 16:00 | 2 |
| 04:00 | 2 |
| 05:00 | 2 |

### Feature touch points
| Feature | Usage count |
| --- | ---: |
| graph_drill | 12 |
| timeline | 12 |
| alerts | 8 |
| ml_insights | 6 |
| report_builder | 4 |
| dashboard | 4 |
| acknowledgements | 3 |
| executive_summary | 3 |
| api_proxy | 3 |
| threat_notes | 1 |
| sandbox | 1 |

### Latency hotspots by region and device
| Region | Device | Avg latency (ms) | P90 latency (ms) |
| --- | --- | ---: | ---: |
| APAC | mobile | 410.0 | 410.0 |
| NA | mobile | 360.0 | 360.0 |
| NA | tablet | 311.67 | 320.0 |
| EU | tablet | 307.5 | 305.0 |
| LATAM | desktop | 251.67 | 255.0 |
| EU | desktop | 211.6 | 218.0 |
| NA | desktop | 175.64 | 205.0 |
| APAC | desktop | 159.0 | 88.0 |

## Threat Detection Signals

* **Sessions with security flags or automation signatures:** 4
* **Automation-like velocity clusters:** 3
* **Power users on low latency paths (optimize for them):** 3

### Suspicious sessions
| Session | User | Clicks/min | Edit rate | Focus ratio | Latency (ms) | Flags |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| S-1010 | analyst-03 | 12.5 | 3.6 | 0.27 | 185 | bulk_export_attempt |
| S-1016 | automation-01 | 45.0 | 6.5 | 0.04 | 95 | rapid_edit_macro |
| S-1017 | automation-02 | 43.7 | 7.1 | 0.03 | 88 | rapid_edit_macro, unauthorized_endpoint |
| S-1018 | automation-01 | 43.8 | 6.8 | 0.05 | 92 | rapid_edit_macro |

### Long-form scanning cohorts
| Session | User | Minutes in view | Clicks/min | Scroll depth % |
| --- | --- | ---: | ---: | ---: |
| S-1008 | exec-01 | 8.0 | 4.0 | 52.0 |

### High-intensity investigative sessions
| Session | User | Clicks/min | Edit rate | Interaction intensity | Latency (ms) |
| --- | --- | ---: | ---: | ---: | ---: |
| S-1016 | automation-01 | 45.0 | 6.5 | 52.0 | 95 |
| S-1017 | automation-02 | 43.7 | 7.1 | 53.3 | 88 |
| S-1018 | automation-01 | 43.8 | 6.8 | 52.3 | 92 |
