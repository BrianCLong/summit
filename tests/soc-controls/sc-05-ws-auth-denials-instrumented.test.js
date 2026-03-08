"use strict";
/**
 * SOC Control SC-05: WebSocket auth denials are instrumented
 *
 * Trust Service Criterion: CC6.1 (Logical Access Security)
 * Requirement: WebSocket authentication and permission failures must be
 *              tracked via structured Prometheus metrics with reason/tenant
 *              labels, enabling SOC to detect brute-force or credential-stuffing.
 *
 * Verification: Confirm WebSocket auth middleware calls security denial
 *               recording functions and that Prometheus metrics are defined.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const WS_AUTH_PATH = (0, path_1.resolve)(__dirname, '../../services/websocket-server/src/middleware/auth.ts');
const WS_METRICS_PATH = (0, path_1.resolve)(__dirname, '../../services/websocket-server/src/metrics/prometheus.ts');
describe('SC-05: WebSocket auth denials are instrumented', () => {
    let wsAuthSource;
    let wsMetricsSource;
    beforeAll(() => {
        wsAuthSource = (0, fs_1.readFileSync)(WS_AUTH_PATH, 'utf-8');
        wsMetricsSource = (0, fs_1.readFileSync)(WS_METRICS_PATH, 'utf-8');
    });
    it('WS auth middleware imports metrics module', () => {
        expect(wsAuthSource).toContain("from '../metrics/prometheus.js'");
    });
    it('WS auth middleware records security auth denials on missing token', () => {
        expect(wsAuthSource).toContain("recordSecurityAuthDenial('no_token'");
    });
    it('WS auth middleware records security auth denials on expired token', () => {
        expect(wsAuthSource).toContain("recordSecurityAuthDenial('token_expired'");
    });
    it('WS auth middleware records security auth denials on invalid token', () => {
        expect(wsAuthSource).toContain("recordSecurityAuthDenial('invalid_token'");
    });
    it('WS auth middleware records permission denials', () => {
        expect(wsAuthSource).toContain('recordSecurityPermissionDenial');
    });
    it('Prometheus defines websocket_security_auth_denials_total metric', () => {
        expect(wsMetricsSource).toContain('websocket_security_auth_denials_total');
    });
    it('Prometheus defines websocket_security_permission_denials_total metric', () => {
        expect(wsMetricsSource).toContain('websocket_security_permission_denials_total');
    });
    it('Prometheus defines websocket_security_sensitive_events_total for spike detection', () => {
        expect(wsMetricsSource).toContain('websocket_security_sensitive_events_total');
    });
});
