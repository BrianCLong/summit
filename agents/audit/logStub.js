const fs = require("fs");
const path = require("path");

const logPath = path.join(__dirname, "logs", "agent-audit.log");

function ensureLogFile() {
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, "", "utf8");
  }
}

function appendAuditEvent(event) {
  ensureLogFile();
  const entry = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

module.exports = {
  appendAuditEvent,
  logPath,
};
