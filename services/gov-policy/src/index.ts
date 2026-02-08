import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gov-policy" });
});

// Preflight check for privileged actions
app.post("/preflight", (req, res) => {
  const { actor, resource, action, attributes } = req.body;

  // Mock policy logic
  let allow = true;
  let reason = "Policy check passed.";
  let policy_version = "v1.0.0";

  if (action === "delete" && resource?.type === "database") {
    allow = false;
    reason = "Deletion of databases is not allowed by default policy.";
  } else if (action === "deploy" && attributes?.env === "production") {
      // Require approval for prod deploy (though in preflight we might say allow=false or return a 'require_approval' status, for now let's say allow=false with reason)
      allow = false;
      reason = "Production deployment requires manual approval.";
  }

  res.json({
    allow,
    reason,
    policy_version,
    trace_id: `trace-${Date.now()}`
  });
});

app.listen(port, () => {
  console.log(`Gov-Policy service listening at http://localhost:${port}`);
});
