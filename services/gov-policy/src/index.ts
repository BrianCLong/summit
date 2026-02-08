import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gov-policy" });
});

app.listen(port, () => {
  console.log(`Gov-Policy service listening at http://localhost:${port}`);
});
