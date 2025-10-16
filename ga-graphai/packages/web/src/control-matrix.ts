import type {
  AssignmentPlan,
  ManualControlPlan,
  WorkParcelPlan,
} from '../../common-types/src/index.js';

type ControlToggle = {
  readonly label: string;
  readonly enabled: boolean;
};

export interface ControlMatrixRow {
  readonly ticketId: string;
  readonly workerId: string;
  readonly toggles: readonly ControlToggle[];
}

function togglesFromPlan(plan: ManualControlPlan): readonly ControlToggle[] {
  return [
    { label: 'Pause before navigation', enabled: plan.pauseBeforeNavigation },
    { label: 'Pause before prompt', enabled: plan.pauseBeforePrompt },
    { label: 'Pause before capture', enabled: plan.pauseBeforeCapture },
  ];
}

function rowFromParcel(parcel: WorkParcelPlan): ControlMatrixRow {
  return {
    ticketId: parcel.ticket.id,
    workerId: parcel.worker.id,
    toggles: togglesFromPlan(parcel.manualControl),
  };
}

export function buildControlMatrix(
  plan: AssignmentPlan,
): readonly ControlMatrixRow[] {
  return plan.parcels.map(rowFromParcel);
}

export const ui = {
  buildControlMatrix,
};
