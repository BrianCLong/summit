import * as fs from 'node:fs';

function main() {
  const target = '/etc/shadow';
  let leaked = false;
  try {
      if (fs.existsSync(target)) {
          fs.accessSync(target, fs.constants.R_OK);
          leaked = true;
      }
  } catch (e) {
      leaked = false;
  }

  const evidence = {
      containment_target: target,
      cve: "CVE-2026-25145",
      evidenceId: "EVID:containment-check",
      leaked: leaked
  };

  const json = JSON.stringify(evidence, null, 2);
  console.log(json);
  if (process.env.GATE_OUTPUT) {
      fs.writeFileSync(process.env.GATE_OUTPUT, json);
  }

  if (leaked) {
      console.error(`Containment Check Failed: Could read ${target}.`);
  }
}

main();
