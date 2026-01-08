import axios from "axios";
import { isGAFlagEnabled } from "../server/src/feature-flags/index.js";

const BASE_URL = "http://localhost:3000"; // Assuming server runs on 3000

async function runGAVerification() {
  console.log("Starting GA Verification...");
  let failures = 0;

  // 1. Healthz
  try {
    const res = await axios.get(`${BASE_URL}/healthz`);
    if (res.status === 200 && res.data.status === "ok" && res.data.boot) {
      console.log("✅ /healthz passed");
    } else {
      console.error("❌ /healthz failed", res.data);
      failures++;
    }
  } catch (e) {
    console.error("❌ /healthz error", e.message);
    failures++;
  }

  // 2. Readyz
  try {
    const res = await axios.get(`${BASE_URL}/readyz`);
    if (res.status === 200 && res.data.status === "ready" && res.data.audit) {
      console.log("✅ /readyz passed");
    } else {
      console.error("❌ /readyz failed", res.data);
      failures++;
    }
  } catch (e) {
    console.error("❌ /readyz error", e.message);
    failures++;
  }

  // 3. Analyze (Valid)
  try {
    const res = await axios.post(`${BASE_URL}/api/v1/analyze`, {
      text: "Test content",
      context: { locale: "en-US" },
    });
    if (res.status === 200 && res.data.narrative_id && res.data.xai.audit_hash) {
      console.log("✅ /v1/analyze (valid) passed");
    } else {
      console.error("❌ /v1/analyze (valid) failed", res.data);
      failures++;
    }
  } catch (e) {
    console.error("❌ /v1/analyze (valid) error", e.message);
    failures++;
  }

  // 4. Analyze (Invalid - missing text)
  try {
    await axios.post(`${BASE_URL}/api/v1/analyze`, {
      context: { locale: "en-US" },
    });
    console.error("❌ /v1/analyze (invalid) failed - expected 400");
    failures++;
  } catch (e) {
    if (e.response && e.response.status === 400) {
      console.log("✅ /v1/analyze (invalid) passed");
    } else {
      console.error("❌ /v1/analyze (invalid) error", e.message);
      failures++;
    }
  }

  // 5. Counter (Unsafe Mode)
  try {
    await axios.post(`${BASE_URL}/api/v1/counter`, {
      narrative_id: "123",
      mode: "attack_mode", // Unsafe
      human_approved: true,
    });
    console.error("❌ /v1/counter (unsafe) failed - expected 400");
    failures++;
  } catch (e) {
    if (e.response && e.response.status === 400 && e.response.data.gate === "BLOCK") {
      console.log("✅ /v1/counter (unsafe) passed");
    } else {
      console.error("❌ /v1/counter (unsafe) error", e.message);
      failures++;
    }
  }

  // 6. Counter (No Approval)
  try {
    const res = await axios.post(`${BASE_URL}/api/v1/counter`, {
      narrative_id: "123",
      mode: "prebunk",
      human_approved: false,
    });
    if (res.data.gate === "HOLD") {
      console.log("✅ /v1/counter (hold) passed");
    } else {
      console.error("❌ /v1/counter (hold) failed", res.data);
      failures++;
    }
  } catch (e) {
    console.error("❌ /v1/counter (hold) error", e.message);
    failures++;
  }

  // 7. Feature Flags
  if (isGAFlagEnabled("detector_v3") && !isGAFlagEnabled("ephemeral_frame_detector")) {
    console.log("✅ Feature flags passed");
  } else {
    console.error("❌ Feature flags failed check");
    failures++;
  }

  if (failures > 0) {
    console.error(`\nFAILED: ${failures} checks failed.`);
    process.exit(1);
  } else {
    console.log("\nALL CHECKS PASSED");
  }
}

runGAVerification();
