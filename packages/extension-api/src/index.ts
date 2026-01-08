// Core extension point
export type { ExtensionPoint, ExtensionPointRegistry } from "./ExtensionPoint.js";

// Extension types
export * from "./extensions/DataSourceExtension.js";
export * from "./extensions/AnalyzerExtension.js";
export * from "./extensions/VisualizationExtension.js";
export * from "./extensions/ExportExtension.js";
export * from "./extensions/AuthProviderExtension.js";
export * from "./extensions/WorkflowExtension.js";

// New Extension Surface Definition Types
export * from "./extensions/ActionExtension.js";
export * from "./extensions/TriggerExtension.js";
export * from "./extensions/UIPanelExtension.js";
export * from "./extensions/DataConnectorExtension.js";
export * from "./extensions/AutomationExtension.js";
