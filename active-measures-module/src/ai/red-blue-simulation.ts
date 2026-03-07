/**
 * Red-Blue Adversarial Simulation Engine
 *
 * Provides a simple framework for modelling attacker (Red Team) actions
 * and defensive (Blue Team) controls.  Each simulation run calculates basic
 * effectiveness metrics that can be used by higher level orchestration or
 * visualization layers.
 */

export interface RedAction {
  id: string;
  tactic: string; // MITRE ATT&CK tactic identifier
  timestamp: number; // epoch milliseconds
  success: boolean;
}

export interface BlueControl {
  id: string;
  name: string;
  detects: string[]; // array of tactic identifiers this control can detect
  effectiveness: number; // 0-1 scale probability of detection
}

export interface SimulationScorecard {
  timeToDetect: number; // milliseconds from first action to detection, -1 if undetected
  lateralSpread: number; // count of successful actions before detection
  containmentTime: number; // naive metric: detection time + 1 for now
}

/**
 * Execute a simple red/blue simulation.
 *
 * @param actions list of red team actions ordered by timestamp
 * @param controls list of defensive controls
 */
export function runRedBlueSimulation(
  actions: RedAction[],
  controls: BlueControl[]
): SimulationScorecard {
  if (actions.length === 0) {
    return { timeToDetect: -1, lateralSpread: 0, containmentTime: -1 };
  }

  const start = actions[0].timestamp;
  let detectedAt = -1;
  let spread = 0;

  for (const action of actions) {
    if (!action.success) continue;
    if (detectedAt === -1) {
      spread += 1;
      const triggered = controls.some((c) => {
        if (!c.detects.includes(action.tactic)) return false;
        return Math.random() < c.effectiveness;
      });
      if (triggered) {
        detectedAt = action.timestamp;
      }
    }
  }

  return {
    timeToDetect: detectedAt === -1 ? -1 : detectedAt - start,
    lateralSpread: detectedAt === -1 ? spread : spread - 1,
    containmentTime: detectedAt === -1 ? -1 : detectedAt - start + 1,
  };
}
