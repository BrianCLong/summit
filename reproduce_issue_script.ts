import express from "express";
import request from "supertest";
import { ipWhitelist } from "./server/src/middleware/security.ts";
import assert from "assert";

async function runTest() {
  console.log("Running Trust Proxy Reproduction Test...");

  const app = express();

  // Middleware that relies on IP
  app.use("/admin", ipWhitelist(["10.0.0.1"]));

  app.get("/admin", (req, res) => {
    res.status(200).send("Admin Access Granted");
  });

  app.get("/ip", (req, res) => {
    res.send(req.ip);
  });

  console.log("Test 1: Request with X-Forwarded-For should fail without trust proxy");
  try {
    const res = await request(app).get("/admin").set("X-Forwarded-For", "10.0.0.1"); // The whitelisted IP

    if (res.status === 403) {
      console.log("✅ PASSED: Access correctly denied (403) because trust proxy is off.");
    } else {
      console.error(`❌ FAILED: Status was ${res.status}, expected 403.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  console.log("Test 2: Check req.ip value");
  try {
    const res = await request(app).get("/ip").set("X-Forwarded-For", "123.123.123.123");

    if (res.text !== "123.123.123.123") {
      console.log(`✅ PASSED: req.ip (${res.text}) does NOT match X-Forwarded-For as expected.`);
    } else {
      console.error(`❌ FAILED: req.ip matches X-Forwarded-For unexpectedly.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }

  console.log("All reproduction tests passed (vulnerability confirmed).");
}

runTest();
