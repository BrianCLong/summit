"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMaestroEnabled = isMaestroEnabled;
exports.isEnhancedTriPaneEnabled = isEnhancedTriPaneEnabled;
exports.isExplainViewEnabled = isExplainViewEnabled;
exports.isCaseExportRevampEnabled = isCaseExportRevampEnabled;
// =============================================
// File: apps/web/src/lib/flags.ts
// =============================================
function isMaestroEnabled() {
    // Vite prefixes client env with VITE_
    const raw = import.meta.env?.VITE_MAESTRO_ENABLED;
    if (raw === undefined) {
        return true;
    } // default enabled in dev
    return String(raw).toLowerCase() === 'true';
}
function isEnhancedTriPaneEnabled() {
    const raw = import.meta.env?.VITE_ENHANCED_TRI_PANE_ENABLED;
    if (raw === undefined) {
        return true;
    } // default enabled in dev
    return String(raw).toLowerCase() === 'true';
}
function isExplainViewEnabled() {
    const raw = import.meta.env?.VITE_EXPLAIN_VIEW_ENABLED;
    if (raw === undefined) {
        return true;
    } // default enabled in dev
    return String(raw).toLowerCase() === 'true';
}
function isCaseExportRevampEnabled() {
    const raw = import.meta.env?.VITE_CASE_EXPORT_REVAMP_ENABLED;
    if (raw === undefined) {
        return true;
    } // default enabled in dev
    return String(raw).toLowerCase() !== 'false';
}
