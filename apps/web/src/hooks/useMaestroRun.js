"use strict";
// src/hooks/useMaestroRun.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMaestroRun = useMaestroRun;
const react_1 = require("react");
const maestro_1 = require("@/lib/api/maestro");
function useMaestroRun(initialUserId) {
    const [state, setState] = (0, react_1.useState)({
        isRunning: false,
        error: null,
        data: null,
    });
    const userIdRef = (0, react_1.useRef)(initialUserId);
    const abortRef = (0, react_1.useRef)(null);
    const run = (0, react_1.useCallback)(async (requestText) => {
        if (!requestText.trim())
            return;
        // Abort any previous run
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;
        setState(prev => ({
            ...prev,
            isRunning: true,
            error: null,
        }));
        try {
            const data = await (0, maestro_1.runMaestroRequest)({
                userId: userIdRef.current,
                requestText,
                signal: controller.signal,
            });
            setState({
                isRunning: false,
                error: null,
                data,
            });
        }
        catch (err) {
            if (controller.signal.aborted) {
                return;
            }
            setState(prev => ({
                ...prev,
                isRunning: false,
                error: err?.message ?? 'Unknown error while running Maestro pipeline.',
            }));
        }
    }, []);
    const reset = (0, react_1.useCallback)(() => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
        setState({
            isRunning: false,
            error: null,
            data: null,
        });
    }, []);
    return { state, run, reset };
}
