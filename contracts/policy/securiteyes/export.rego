package securiteyes.export

result := {
  "allowed": data.securiteyes.abac.allow,
  "abac_denies": data.securiteyes.abac.deny,
  "gate_pass": data.securiteyes.gates.pass,
  "gate_messages": data.securiteyes.gates.messages,
}
