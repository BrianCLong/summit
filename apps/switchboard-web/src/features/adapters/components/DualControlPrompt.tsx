import React, { useMemo, useState } from "react";
import { Adapter } from "../types";
import { AdapterAction } from "./AdapterCard";

interface DualControlPromptProps {
  adapter: Adapter;
  action: AdapterAction;
  onConfirm: (options: { approver: string; justification: string }) => void;
  onCancel: () => void;
}

export const DualControlPrompt: React.FC<DualControlPromptProps> = ({
  adapter,
  action,
  onCancel,
  onConfirm,
}) => {
  const [approver, setApprover] = useState("");
  const [justification, setJustification] = useState("");

  const disableConfirm = useMemo(
    () => approver.trim().length < 3 || justification.trim().length < 10,
    [approver, justification]
  );

  const actionLabel = useMemo(() => {
    switch (action) {
      case "enable":
        return "Enable";
      case "disable":
        return "Disable";
      case "uninstall":
        return "Uninstall";
      case "install":
        return "Install";
      default:
        return "Verify";
    }
  }, [action]);

  return (
    <div className="dual-control-backdrop" role="dialog" aria-modal="true">
      <div className="dual-control-card">
        <h3>
          {actionLabel} {adapter.name}
        </h3>
        <p>
          {adapter.name} requires dual control. Capture the peer approver and rationale before we
          call the Switchboard API.
        </p>
        <div className="dual-control-form">
          <label htmlFor="approver-input">Second approver</label>
          <input
            id="approver-input"
            placeholder="email or handle"
            value={approver}
            onChange={(event) => setApprover(event.target.value)}
          />
          <label htmlFor="justification-input">Justification</label>
          <textarea
            id="justification-input"
            rows={3}
            placeholder="Explain why this action is needed"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={disableConfirm}
            onClick={() => onConfirm({ approver, justification })}
          >
            Confirm &amp; send
          </button>
        </div>
      </div>
    </div>
  );
};
