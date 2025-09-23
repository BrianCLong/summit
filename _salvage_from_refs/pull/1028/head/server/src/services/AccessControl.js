/**
 * Simple rule-engine style ABAC scaffolding.
 * Rules are evaluated against user attributes and resource attributes.
 */

const defaultRules = [
  // Example: deny access to resources with sensitivity 'high' unless user clearance >= 'secret'
  (ctx) => {
    const { action, user, resource } = ctx;
    const sensitivity = resource?.sensitivity || "low";
    const clearance = user?.clearance || "public";
    const order = ["public", "internal", "confidential", "secret", "topsecret"];
    if (
      sensitivity === "high" &&
      order.indexOf(clearance) < order.indexOf("secret")
    ) {
      return { allow: false, reason: "Insufficient clearance" };
    }
    return null; // no decision
  },
];

async function evaluateOPA(action, user, resource = {}, env = {}) {
  const opaUrl = process.env.OPA_URL; // e.g., http://localhost:8181/v1/data/intelgraph/allow
  if (!opaUrl) return null;
  try {
    const fetch = require("node-fetch");
    const res = await fetch(opaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { action, user, resource, env } }),
    });
    const data = await res.json();
    if (typeof data.result === "boolean") {
      return { allow: data.result };
    }
  } catch (e) {
    // Fallback to rule engine on failure
  }
  return null;
}

async function evaluate(action, user, resource = {}, env = {}) {
  const opa = await evaluateOPA(action, user, resource, env);
  if (opa) return opa;
  for (const rule of defaultRules) {
    const res = rule({ action, user, resource, env });
    if (res) return res;
  }
  return { allow: true };
}

module.exports = { evaluate };
