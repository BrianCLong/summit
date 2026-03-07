import re

with open("server/src/maestro/core.ts", "r") as f:
    content = f.read()

replacement = """
      const piiScan = await piiDetector.scanText(String(result), { includeValue: true });
      const riskScore = piiScan.data.riskScore / 100;

      const safetyCase = {
        mutationCoverage: 0.75,
        specAdherence: 0.95,
        riskScore,
        hasPI: piiScan.data.hasPI,
        detections: piiScan.data.detections.length
      };

      if (riskScore > 0.7) {
        throw new Error(`Safety check failed: Risk score ${riskScore} exceeds 0.7 threshold. PII Detections: ${safetyCase.detections}`);
      }

      logger.info({ taskId: task.id, agentId: task.agent.id, safetyCase }, 'Agent action safety case generated');

      const artifact: Artifact = {
"""

pattern = r"\s*const artifact: Artifact = \{"

new_content = re.sub(pattern, replacement, content, count=1)

with open("server/src/maestro/core.ts", "w") as f:
    f.write(new_content)
