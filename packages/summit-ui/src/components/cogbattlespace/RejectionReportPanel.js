"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectionReportPanel = RejectionReportPanel;
const react_1 = __importDefault(require("react"));
function RejectionReportPanel({ report }) {
    return (<div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Write Report</div>
        <div className={`text-xs px-2 py-1 rounded-xl border ${report.ok ? "bg-white" : "bg-black text-white"}`}>
          {report.ok ? "OK" : "REJECTED"}
        </div>
      </div>

      <div className="mt-2 text-xs opacity-70">
        writeset={report.writesetId} · received={report.summary.receivedOps} · accepted={report.summary.acceptedOps} ·
        rejected={report.summary.rejectedOps}
      </div>

      <div className="mt-4 grid gap-2">
        {report.items.map((it) => (<div key={it.opId} className="p-3 rounded-xl border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {it.opId}{" "}
                <span className="text-xs opacity-70">
                  {it.domain ? `· ${it.domain}` : ""} {it.entityType ? `· ${it.entityType}` : ""}{" "}
                  {it.action ? `· ${it.action}` : ""}
                </span>
              </div>
              <div className={`text-xs px-2 py-1 rounded-xl border ${it.status === "ACCEPTED" ? "" : "bg-black text-white"}`}>
                {it.status}
              </div>
            </div>

            {it.errors?.length ? (<ul className="mt-2 list-disc pl-5 text-xs">
                {it.errors.map((e, idx) => (<li key={idx}>
                    <span className="font-semibold">{e.code}</span>: {e.message}
                    {e.instancePath ? <span className="opacity-70"> · path={e.instancePath}</span> : null}
                    {e.schemaPath ? <span className="opacity-70"> · schema={e.schemaPath}</span> : null}
                  </li>))}
              </ul>) : (<div className="mt-2 text-xs opacity-70">No errors.</div>)}
          </div>))}
      </div>
    </div>);
}
