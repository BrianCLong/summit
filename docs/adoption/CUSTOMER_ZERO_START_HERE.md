# Customer Zero - Start Here

Welcome to the Summit Platform. This document is your starting point for a rapid, safe, and bounded evaluation of the platform's General Availability (GA) capabilities.

Our goal is to help you prove the platform's core value proposition quickly while maintaining a production-grade security posture.

---

## What You Can Verify in 30 Minutes

Within 30 minutes, you can accomplish a full "golden path" verification. This is a scripted test that proves the fundamental capabilities of the platform are functioning correctly. It includes:

1.  **System Health Check:** Verifying that all core services are running.
2.  **Data Ingestion:** Ingesting a small, sample dataset into the IntelGraph.
3.  **Orchestration:** Running a pre-defined analysis workflow using the Maestro Orchestrator.
4.  **Provenance:** Confirming that all actions were recorded in the immutable audit ledger.

---

## Primary Run Command (Fast Proof)

The entire "golden path" verification is executed with a single command. This is the most important command for your initial evaluation.

**Run this from the repository root:**

```bash
make smoke
```

This command is deterministic and anchored to the GA baseline. It is the same check we use in our CI/CD pipeline to validate every change.

---

## What Success Looks Like

A successful run of the smoke test will produce output indicating that all stages of the test passed. You will see logs confirming:

*   Services starting up.
*   Database connections established.
*   Data ingestion completing successfully.
*   Orchestration jobs being queued and completed.
*   The final output will confirm that the "Golden Path" test succeeded.

A successful run proves that the core architectural pillars—secure services, data integrity, and workflow orchestration—are functioning as designed.

---

## Where to Go Next

Once you have successfully run the smoke test, you are ready for a more in-depth evaluation. The next document will guide you through a 2-3 hour detailed evaluation plan.

**Next Step:** Proceed to the **[Customer Zero Evaluation Plan](./CUSTOMER_ZERO_EVALUATION_PLAN.md)**.
