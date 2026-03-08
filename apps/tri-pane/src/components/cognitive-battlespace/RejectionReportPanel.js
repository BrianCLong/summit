"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectionReportPanel = RejectionReportPanel;
const react_1 = __importDefault(require("react"));
function RejectionReportPanel({ report }) {
    return (<section className="rounded-xl border border-sand/20 p-4">
      <h3 className="text-sm font-semibold">Write report · {report.writesetId}</h3>
      <p className="mt-1 text-xs text-sand/70">
        received={report.summary.receivedOps} accepted={report.summary.acceptedOps} rejected={report.summary.rejectedOps}
      </p>
      <div className="mt-3 grid gap-2 text-xs">
        {report.items.map((item) => (<div key={item.opId} className="rounded-lg border border-sand/20 p-2">
            <div>
              {item.opId} · {item.status} {item.domain ? `· ${item.domain}` : ''}
            </div>
            {item.errors?.map((error) => (<div key={`${item.opId}-${error.code}`} className="text-rose-300">
                {error.code}: {error.message}
              </div>))}
          </div>))}
      </div>
    </section>);
}
