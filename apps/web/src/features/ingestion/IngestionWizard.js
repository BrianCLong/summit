"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionWizard = IngestionWizard;
const react_1 = __importDefault(require("react"));
function IngestionWizard() {
    return (<section className="rounded-lg border bg-white p-6">
      <h2 className="text-lg font-semibold">Ingestion Setup</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Connector setup is temporarily unavailable in this build.
      </p>
    </section>);
}
