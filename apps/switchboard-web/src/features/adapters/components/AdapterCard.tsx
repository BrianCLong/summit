import React from "react";
import clsx from "clsx";
import { Adapter, AdapterActionPayload } from "../types";

export type AdapterAction = "install" | "enable" | "disable" | "uninstall" | "verify";

interface AdapterCardProps {
  adapter: Adapter;
  onAction: (action: AdapterAction, payload?: AdapterActionPayload) => void;
  isBusy?: boolean;
  errorMessage?: string;
  policyErrors?: string[];
  verificationErrors?: string[];
  receiptUrl?: string;
}

function Badge({ status }: { status: Adapter["status"] }) {
  return (
    <span className="badge" data-status={status}>
      {status}
    </span>
  );
}

function MetaItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="meta-item">
      <span className="meta-label">{label}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}

export const AdapterCard: React.FC<AdapterCardProps> = ({
  adapter,
  onAction,
  isBusy,
  errorMessage,
  policyErrors,
  verificationErrors,
  receiptUrl,
}) => {
  const showInstall = adapter.status === "available";
  const canEnable = adapter.status === "installed" || adapter.status === "disabled";
  const canDisable = adapter.status === "enabled";
  const canUninstall = adapter.status === "installed" || adapter.status === "disabled";

  return (
    <article className="adapter-card" aria-busy={isBusy} aria-live="polite">
      <div className="adapter-header">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            {adapter.highPrivilege ? "High privilege adapter" : "Adapter"}
          </p>
          <h2 className="adapter-name">{adapter.name}</h2>
        </div>
        <Badge status={adapter.status} />
      </div>

      <div className="adapter-meta">
        <MetaItem label="Version" value={adapter.version} />
        <MetaItem
          label="Last run"
          value={adapter.lastRunAt ? new Date(adapter.lastRunAt).toLocaleString() : "—"}
        />
        <MetaItem label="Last error" value={adapter.lastError || "None"} />
      </div>

      {adapter.description ? <p className="lede">{adapter.description}</p> : null}

      <div>
        <div className="meta-label">Config</div>
        <div className="config-box" role="presentation">
          {typeof adapter.config === "string"
            ? adapter.config
            : JSON.stringify(adapter.config, null, 2)}
        </div>
      </div>

      <div className="actions" aria-label={`Actions for ${adapter.name}`}>
        {showInstall && (
          <button className="button primary" disabled={isBusy} onClick={() => onAction("install")}>
            Install
          </button>
        )}
        {canEnable && (
          <button className="button primary" disabled={isBusy} onClick={() => onAction("enable")}>
            Enable
          </button>
        )}
        {canDisable && (
          <button className="button" disabled={isBusy} onClick={() => onAction("disable")}>
            Disable
          </button>
        )}
        {canUninstall && (
          <button
            className={clsx("button", "danger")}
            disabled={isBusy}
            onClick={() => onAction("uninstall")}
          >
            Uninstall
          </button>
        )}
        <button className="button" disabled={isBusy} onClick={() => onAction("verify")}>
          Verify
        </button>
      </div>

      {receiptUrl ? (
        <div className="status-row">
          <span className="meta-label">Receipt</span>
          <a className="receipt-link" href={receiptUrl} target="_blank" rel="noreferrer">
            View receipt
          </a>
        </div>
      ) : null}

      {errorMessage || policyErrors?.length || verificationErrors?.length ? (
        <div className="error-box" role="status">
          <div className="error-title">Action blocked</div>
          {errorMessage ? <p style={{ margin: "4px 0" }}>{errorMessage}</p> : null}
          {policyErrors && policyErrors.length > 0 ? (
            <div>
              <div className="meta-label">Policy</div>
              <ul className="error-list">
                {policyErrors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {verificationErrors && verificationErrors.length > 0 ? (
            <div>
              <div className="meta-label">Verification</div>
              <ul className="error-list">
                {verificationErrors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};
