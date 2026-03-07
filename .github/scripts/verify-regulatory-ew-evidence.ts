import fs from "node:fs"

const required = [
  "evidence/regulatory-early-warning/report.json",
  "evidence/regulatory-early-warning/metrics.json",
  "evidence/regulatory-early-warning/stamp.json",
  "evidence/regulatory-early-warning/index.json"
]

for (const path of required) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing required evidence file: ${path}`)
  }
}
