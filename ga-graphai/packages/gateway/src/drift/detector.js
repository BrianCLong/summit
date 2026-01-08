export function classifyDrift(desired, runtime) {
  const diff = [];
  for (const [key, desiredVal] of Object.entries(desired)) {
    const runtimeVal = runtime[key];
    if (runtimeVal === undefined) {
      diff.push({ key, type: "missing", severity: "critical" });
    } else if (runtimeVal !== desiredVal) {
      diff.push({ key, type: "changed", severity: severityForKey(key, desiredVal, runtimeVal) });
    }
  }
  for (const key of Object.keys(runtime)) {
    if (!(key in desired)) {
      diff.push({ key, type: "unexpected", severity: "warn" });
    }
  }
  return diff;
}

function severityForKey(key, desiredVal, runtimeVal) {
  if (key.toLowerCase().includes("security") && desiredVal !== runtimeVal) {
    return "critical";
  }
  if (key.toLowerCase().includes("replica")) {
    return "warn";
  }
  return "info";
}

export function summarizeDrift(diff) {
  const summary = {
    critical: diff.filter((d) => d.severity === "critical"),
    warn: diff.filter((d) => d.severity === "warn"),
    info: diff.filter((d) => d.severity === "info"),
  };
  const hasCritical = summary.critical.length > 0;
  return {
    summary,
    alert: hasCritical,
    message: hasCritical ? "Critical drift detected; trigger PagerDuty" : "Drift within tolerance",
  };
}

export function buildDriftReport({ desired, runtime }) {
  const diff = classifyDrift(desired, runtime);
  const { alert, message, summary } = summarizeDrift(diff);
  return {
    diff,
    alert,
    message,
    summary,
  };
}
