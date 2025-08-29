# Red-Blue Adversarial Simulation Mode

The Red-Blue Adversarial Simulation Mode allows analysts to model attacker behaviour and defensive controls within the IntelGraph ecosystem. It transforms static intelligence into an interactive cyber wargaming environment.

## Capabilities

- **Red Team Agents**
  - Represent adversary actions mapped to MITRE ATT&CK tactics.
  - Configurable sequences for initial access, lateral movement, and escalation.
  - Actions are recorded with timestamps for replay and analysis.
- **Blue Team Controls**
  - Nodes for SIEM, EDR, honeypots, and other detection mechanisms.
  - Coverage metadata defines which tactics each control can detect.
  - Effectiveness can be toggled to simulate blind spots or failures.
- **Scorecard Metrics**
  - _Time to Detect_ – elapsed time between attack start and first detection.
  - _Lateral Spread_ – number of successful attacker actions prior to detection.
  - _Containment_ – simple estimate of response time once detection occurs.
- **Interactive Canvas**
  - Visualization layer can step through simulations or play them in real time.
  - Analysts can adjust both attacker tactics and defensive posture on the fly.

## Implementation Notes

This repository now includes a lightweight simulation engine in
`active-measures-module/src/ai/red-blue-simulation.ts` which calculates basic scorecard metrics. The implementation is framework agnostic and can be extended with richer agent behaviours or integrated with frontend visualizations in subsequent iterations.
