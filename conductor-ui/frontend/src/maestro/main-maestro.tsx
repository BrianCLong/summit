import React from "react";
import ReactDOM from "react-dom/client";
import MaestroApp from "./App";
import "../index.css";

// Simplified telemetry setup - comment out complex OpenTelemetry for now
// TODO: Add proper OpenTelemetry configuration when exporter packages are available

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <MaestroApp />
  </React.StrictMode>
);
