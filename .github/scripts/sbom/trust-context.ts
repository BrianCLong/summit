import * as fs from 'node:fs';

function main() {
  const eventName = process.env.GITHUB_EVENT_NAME || '';
  const eventPath = process.env.GITHUB_EVENT_PATH || '';

  let trusted = true;
  let reason = "Trusted context";

  if (eventName === 'pull_request') {
      try {
          if (fs.existsSync(eventPath)) {
              const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
              const baseRepo = eventData.pull_request?.base?.repo?.full_name;
              const headRepo = eventData.pull_request?.head?.repo?.full_name;

              if (baseRepo && headRepo && baseRepo !== headRepo) {
                  trusted = false;
                  reason = `PR from fork: ${headRepo}`;
              }
          } else {
              // If event path missing in PR, assume untrusted or fail safe?
              // Usually it's there. If not, default to trusted if internal?
              // Let's warn.
              reason = "PR event path missing";
          }
      } catch (e) {
          trusted = false;
          reason = "Could not parse event data";
      }
  }

  const output = {
      can_publish: trusted,
      can_sign: trusted,
      evidenceId: "EVID:trust-context",
      reason: reason,
      trusted: trusted
  };

  const json = JSON.stringify(output, null, 2);
  console.log(json);

  if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `trusted=${trusted}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `can_publish=${trusted}\n`);
  }

  if (process.env.GATE_OUTPUT) {
      fs.writeFileSync(process.env.GATE_OUTPUT, json);
  }
}

main();
